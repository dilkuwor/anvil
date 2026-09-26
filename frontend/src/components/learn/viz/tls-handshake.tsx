import { ArrowDefs, Box, Edge, Frame, Label, Legend, VIZ_COLORS } from "./primitives";
import { asChoice, asNumber, type StepKind, type VizDefinition, type VizStep } from "./types";

/**
 * The cost of a cold HTTPS request, counted in round trips: TCP handshake (1), TLS
 * handshake (2 for 1.2, 1 for 1.3, 0 with resumption), then the request itself. A second
 * request on the kept-alive connection pays one round trip. Matches the "sd-http-tls"
 * lesson: think in round trips, not milliseconds.
 */

export type TlsVersion = "1.2" | "1.3";
export type TlsPhase = "tcp" | "tls" | "http";
export type TlsMessage = { from: "client" | "server"; text: string; phase: TlsPhase; at: number; row: number; firstByte?: boolean };

export type TlsHandshakeParams = { version: TlsVersion; rtt: number; resume: boolean };

export type TlsHandshakeState = {
  messages: TlsMessage[];
  clock: number;
  roundTrips: number;
  ttfb: number | null;
  secondTtfb: number | null;
};

const DEFAULTS: TlsHandshakeParams = { version: "1.2", rtt: 100, resume: false };

type Flight = { title: string; explain: string; interview: string; kind: StepKind; messages: Omit<TlsMessage, "at" | "row">[] };

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const text = value.trim().toLowerCase();
    if (["true", "yes", "1"].includes(text)) return true;
    if (["false", "no", "0"].includes(text)) return false;
  }
  if (typeof value === "number") return value !== 0;
  return fallback;
}

function tlsFlights(params: TlsHandshakeParams): Flight[] {
  const { version, rtt, resume } = params;
  const handshakeTrips = resume ? (version === "1.3" ? 0 : 1) : version === "1.3" ? 1 : 2;
  const totalTrips = 1 + handshakeTrips + 1;
  const ttfb = totalTrips * rtt;
  const flights: Flight[] = [];

  flights.push({
    title: "TCP handshake: 1 round trip",
    explain: `SYN goes out, SYN-ACK comes back. That is one round trip, ${rtt} ms, and no application data has moved yet. The final ACK rides along with the next message.`,
    interview: "TCP costs one round trip before anything else can happen. QUIC folds this into the TLS handshake, which is one reason HTTP/3 helps on high-latency and lossy links.",
    kind: "invariant",
    messages: [
      { from: "client", text: "SYN", phase: "tcp" },
      { from: "server", text: "SYN-ACK", phase: "tcp" },
    ],
  });

  if (version === "1.2" && !resume) {
    flights.push({
      title: "TLS 1.2: hello and certificate (round trip 2)",
      explain: "The client lists the ciphers it supports. The server replies with its choice and its certificate. Two round trips gone, and no key is agreed yet.",
      interview: "TLS 1.2 needs two round trips because the key exchange can only start after the client has seen the server's certificate. Nothing in my backend can shorten this.",
      kind: "decision",
      messages: [
        { from: "client", text: "ClientHello", phase: "tls" },
        { from: "server", text: "ServerHello + Certificate + Done", phase: "tls" },
      ],
    });
    flights.push({
      title: "TLS 1.2: key exchange and Finished (round trip 3)",
      explain: "The client sends its key material and Finished; the server confirms with its own Finished. Now both sides share a key. Three round trips before the first request.",
      interview: "Upgrading to TLS 1.3 removes one of these round trips. It is a real latency win that needs no code change on the backend, only a newer terminator.",
      kind: "decision",
      messages: [
        { from: "client", text: "ClientKeyExchange + Finished", phase: "tls" },
        { from: "server", text: "Finished", phase: "tls" },
      ],
    });
  } else if (version === "1.2" && resume) {
    flights.push({
      title: "TLS 1.2 resumption: abbreviated handshake (round trip 2)",
      explain: "The client presents a session ticket from an earlier connection. The server skips the certificate and key exchange. One round trip instead of two.",
      interview: "Session resumption reuses keys from an earlier session, so even TLS 1.2 gets to one round trip. It needs every server behind the load balancer to share the ticket keys.",
      kind: "decision",
      messages: [
        { from: "client", text: "ClientHello + session ticket", phase: "tls" },
        { from: "server", text: "ServerHello + Finished", phase: "tls" },
      ],
    });
  } else if (version === "1.3" && !resume) {
    flights.push({
      title: "TLS 1.3: hello with key share (round trip 2)",
      explain: "TLS 1.3 sends the key share inside the first hello, so the server can finish in its first reply. One round trip, and the client can send its request next.",
      interview: "TLS 1.3 handshakes in one round trip because the client guesses the key exchange group up front and ships its key share in the ClientHello.",
      kind: "decision",
      messages: [
        { from: "client", text: "ClientHello + key share", phase: "tls" },
        { from: "server", text: "ServerHello + Certificate + Finished", phase: "tls" },
      ],
    });
  } else {
    flights.push({
      title: "TLS 1.3 resumption: 0-RTT, the request rides with the hello",
      explain: "The client has a pre-shared key from an earlier session. It sends the hello, the key and the GET in one flight, before the server has said anything.",
      interview: "With TLS 1.3 session resumption the handshake costs zero round trips: the client sends early data with its first message. The floor is now TCP plus the request.",
      kind: "decision",
      messages: [{ from: "client", text: "ClientHello + PSK + GET (early data)", phase: "tls" }],
    });
    flights.push({
      title: "0-RTT data can be replayed",
      explain: "Early data is sent before the server proves it is live, so an attacker can capture and replay it. Only idempotent requests such as GET are safe as 0-RTT. Never a POST.",
      interview: "0-RTT is safe only for idempotent requests. That is where the GET, PUT, POST table earns its keep: a replayed POST could charge a card twice, so I only allow 0-RTT for safe methods.",
      kind: "tradeoff",
      messages: [],
    });
  }

  const zeroRtt = version === "1.3" && resume;
  flights.push({
    title: zeroRtt ? `First byte at ${ttfb} ms: 2 round trips` : `Request and first byte: ${totalTrips} round trips, ${ttfb} ms`,
    explain: zeroRtt
      ? `The server accepts the early data and answers in the same flight as its hello. First byte after ${totalTrips} round trips: TCP plus one.`
      : `Now the request goes out and the first byte of the response comes back. This round trip is the actual work; nothing can remove it.`,
    interview: `That is ${totalTrips} round trip${totalTrips === 1 ? "" : "s"} before the server did any work: at ${rtt} ms RTT the floor is ${ttfb} ms. Terminating TLS at a nearby edge makes the handshake trips a few ms each, so only the request crosses the ocean.`,
    kind: "invariant",
    messages: zeroRtt
      ? [{ from: "server", text: "ServerHello + Finished + first byte", phase: "http", firstByte: true }]
      : version === "1.3" && !resume
        ? [
            { from: "client", text: "Finished + GET /", phase: "http" },
            { from: "server", text: "200, first byte", phase: "http", firstByte: true },
          ]
        : version === "1.2" && resume
          ? [
              { from: "client", text: "Finished + GET /", phase: "http" },
              { from: "server", text: "200, first byte", phase: "http", firstByte: true },
            ]
          : [
              { from: "client", text: "GET /", phase: "http" },
              { from: "server", text: "200, first byte", phase: "http", firstByte: true },
            ],
  });

  flights.push({
    title: `Second request on the same connection: 1 round trip, ${rtt} ms`,
    explain: `The connection stays open (keep-alive). The second request skips TCP and TLS entirely: one round trip, ${rtt} ms to the first byte.`,
    interview: "Keep-alive is why the second request is so much cheaper than the first. Without it every request pays the full handshake again. The cost is idle connections holding server memory and file descriptors.",
    kind: "invariant",
    messages: [
      { from: "client", text: "GET /next", phase: "http" },
      { from: "server", text: "200, first byte", phase: "http", firstByte: true },
    ],
  });

  return flights;
}

/** Every message with its arrival time and timeline row, for sizing the view. */
export function tlsMessagePlan(params: TlsHandshakeParams): TlsMessage[] {
  const plan: TlsMessage[] = [];
  let clock = 0;
  let row = 0;
  let seenFirstByte = false;
  for (const flight of tlsFlights(params)) {
    for (const message of flight.messages) {
      clock += params.rtt / 2;
      plan.push({ ...message, at: clock, row });
      row += 1;
      if (message.firstByte && !seenFirstByte) {
        seenFirstByte = true;
        row += 1; // leave a gap row for the keep-alive caption
      }
    }
  }
  return plan;
}

export function tlsHandshakeSteps(params: TlsHandshakeParams): VizStep<TlsHandshakeState>[] {
  const steps: VizStep<TlsHandshakeState>[] = [];
  const plan = tlsMessagePlan(params);
  const flights = tlsFlights(params);
  const label = `TLS ${params.version}${params.resume ? " with session resumption" : ""}`;

  steps.push({
    title: "Cold start: no connection yet",
    explain: `The client wants one byte from a server ${params.rtt} ms away (one round trip). Nothing exists yet: no TCP connection, no TLS session. ${label}.`,
    interview: "Think in round trips, not milliseconds. Before the server does any work, a cold HTTPS request pays a TCP handshake, a TLS handshake and then the request itself.",
    kind: "setup",
    state: { messages: [], clock: 0, roundTrips: 0, ttfb: null, secondTtfb: null },
  });

  let taken = 0;
  let ttfb: number | null = null;
  let secondTtfb: number | null = null;
  for (const flight of flights) {
    taken += flight.messages.length;
    const messages = plan.slice(0, taken);
    const last = messages[messages.length - 1];
    for (const message of flight.messages) {
      if (!message.firstByte) continue;
      const arrival = messages.filter((item) => item.firstByte).map((item) => item.at);
      if (ttfb === null) ttfb = arrival[0];
      else secondTtfb = arrival[arrival.length - 1] - ttfb;
    }
    steps.push({
      title: flight.title,
      explain: flight.explain,
      interview: flight.interview,
      kind: flight.kind,
      state: {
        messages: messages.map((message) => ({ ...message })),
        clock: last ? last.at : 0,
        roundTrips: messages.filter((message) => message.from === "server").length,
        ttfb,
        secondTtfb,
      },
    });
  }

  const cold = ttfb ?? 0;
  const warm = secondTtfb ?? params.rtt;
  const coldTrips = Math.round(cold / params.rtt);
  const finalState = steps[steps.length - 1].state;
  steps.push({
    title: `First byte: ${cold} ms cold, ${warm} ms warm`,
    explain: `Cold: ${coldTrips} round trips = ${cold} ms. Warm, on the kept-alive connection: 1 round trip = ${warm} ms. The difference is all handshake, none of it your code.`,
    interview: `Summary: count the round trips. ${label} cost ${coldTrips} round trips to the first byte, and the second request cost one. I fix handshake cost with TLS 1.3, resumption, keep-alive and edge termination before I touch the backend.`,
    kind: "result",
    state: { ...finalState, messages: finalState.messages.map((message) => ({ ...message })) },
  });

  return steps;
}

const WIDTH = 560;
const CLIENT_X = 120;
const SERVER_X = 440;
const HEAD_Y = 12;
const HEAD_H = 34;
const ROW_Y0 = 78;
const ROW_H = 24;

function phaseTone(phase: TlsPhase): "active" | "hot" | "ok" {
  return phase === "tcp" ? "active" : phase === "tls" ? "hot" : "ok";
}

function phaseColor(phase: TlsPhase): string {
  return phase === "tcp" ? VIZ_COLORS.accent : phase === "tls" ? VIZ_COLORS.coral : VIZ_COLORS.teal;
}

export function TlsHandshakeView({ state, params }: { state: TlsHandshakeState; params: TlsHandshakeParams }) {
  const plan = tlsMessagePlan(params);
  const rows = plan.length ? plan[plan.length - 1].row + 1 : 1;
  const height = ROW_Y0 + rows * ROW_H + 30;
  const last = state.messages[state.messages.length - 1];
  const firstByteRow = plan.find((message) => message.firstByte)?.row ?? null;
  const showKeepAlive = firstByteRow !== null && state.messages.some((message) => message.row > firstByteRow);
  return (
    <div className="space-y-2">
      <Frame width={WIDTH} height={height} label={`TLS ${params.version} handshake timeline at ${params.rtt} ms round trip`}>
        <ArrowDefs />
        <Box x={CLIENT_X - 60} y={HEAD_Y} width={120} height={HEAD_H} title="Client" tone={last?.from === "client" ? "active" : "idle"} />
        <Box x={SERVER_X - 60} y={HEAD_Y} width={120} height={HEAD_H} title="Server" tone={last?.from === "server" ? "active" : "idle"} />
        <Edge from={[CLIENT_X, HEAD_Y + HEAD_H]} to={[CLIENT_X, height - 26]} dashed />
        <Edge from={[SERVER_X, HEAD_Y + HEAD_H]} to={[SERVER_X, height - 26]} dashed />
        <Label x={CLIENT_X - 60} y={HEAD_Y + HEAD_H + 16} size={10}>
          time at client
        </Label>
        {state.messages.map((message, index) => {
          const y = ROW_Y0 + message.row * ROW_H;
          const from: [number, number] = [message.from === "client" ? CLIENT_X : SERVER_X, y];
          const to: [number, number] = [message.from === "client" ? SERVER_X : CLIENT_X, y];
          return (
            <g key={`${index}-${message.text}`}>
              <Edge from={from} to={to} tone={phaseTone(message.phase)} />
              <text x={(CLIENT_X + SERVER_X) / 2} y={y - 5} textAnchor="middle" fontSize={9.5} fontWeight={message.firstByte ? 700 : 500} fill={phaseColor(message.phase)}>
                {message.text}
              </text>
              {message.from === "server" ? (
                <text x={CLIENT_X - 12} y={y + 4} textAnchor="end" fontSize={10} fill={message.firstByte ? VIZ_COLORS.teal : VIZ_COLORS.muted} fontWeight={message.firstByte ? 700 : 500} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                  {Math.round(message.at)} ms
                </text>
              ) : null}
            </g>
          );
        })}
        {showKeepAlive && firstByteRow !== null ? (
          <Label x={(CLIENT_X + SERVER_X) / 2} y={ROW_Y0 + (firstByteRow + 1) * ROW_H + 2} anchor="middle" size={10}>
            connection kept open · next request
          </Label>
        ) : null}
        <Label x={16} y={height - 8} tone="ink" weight={600}>
          t = {Math.round(state.clock)} ms · {state.roundTrips} round trip{state.roundTrips === 1 ? "" : "s"}
        </Label>
        <Label x={WIDTH - 16} y={height - 8} anchor="end" tone={state.ttfb !== null ? "teal" : "muted"} weight={600}>
          {state.ttfb === null ? `TLS ${params.version} · RTT ${params.rtt} ms` : state.secondTtfb === null ? `first byte at ${Math.round(state.ttfb)} ms` : `first byte ${Math.round(state.ttfb)} ms cold · ${Math.round(state.secondTtfb)} ms warm`}
        </Label>
      </Frame>
      <Legend items={[{ tone: "accent", label: "TCP" }, { tone: "coral", label: "TLS" }, { tone: "teal", label: "HTTP request / response" }]} />
    </div>
  );
}

export const tlsHandshakeViz: VizDefinition<TlsHandshakeParams, TlsHandshakeState> = {
  id: "tls-handshake",
  title: "What a cold HTTPS request costs",
  summary: "Client and server messages on a timeline, with a running time-to-first-byte. Count the round trips, then see the kept-alive second request.",
  fields: [
    {
      key: "version",
      label: "TLS version",
      kind: "select",
      options: [
        { value: "1.2", label: "TLS 1.2 (2 round trips)" },
        { value: "1.3", label: "TLS 1.3 (1 round trip)" },
      ],
    },
    { key: "rtt", label: "Round trip (ms)", kind: "number", hint: "Client to server and back." },
    {
      key: "resume",
      label: "Session resumption",
      kind: "select",
      options: [
        { value: "false", label: "No: first visit" },
        { value: "true", label: "Yes: reuse an earlier session" },
      ],
    },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({
    version: asChoice(raw.version, ["1.2", "1.3"] as const, DEFAULTS.version),
    rtt: Math.round(asNumber(raw.rtt, DEFAULTS.rtt, 1, 2000)),
    resume: asBool(raw.resume, DEFAULTS.resume),
  }),
  steps: tlsHandshakeSteps,
  View: TlsHandshakeView,
};
