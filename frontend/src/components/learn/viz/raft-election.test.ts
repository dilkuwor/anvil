import { describe, expect, it } from "vitest";

import { raftElectionSteps, raftElectionViz } from "./raft-election";

describe("raft-election", () => {
  it("elects the follower whose timer fires first with a majority in term 2", () => {
    const steps = raftElectionSteps({ nodes: 5, first: 3, failure: "crash" });
    expect(steps[0].kind).toBe("setup");
    expect(steps[0].state.leader).toBe(1);
    expect(steps[0].state.messages.filter((message) => message.kind === "heartbeat")).toHaveLength(4);
    const failed = steps.find((step) => step.state.phase === "failed")!;
    expect(failed.state.nodes[0].role).toBe("down");
    expect(failed.state.leader).toBeNull();
    const timeout = steps.find((step) => step.state.phase === "timeout")!;
    expect(timeout.state.nodes[2]).toMatchObject({ role: "candidate", term: 2, votedFor: 3 });
    expect(timeout.state.votes).toBe(1);
    const elected = steps.find((step) => step.state.phase === "elected")!;
    expect(elected.state.votes).toBe(4);
    expect(elected.state.majority).toBe(3);
    expect(elected.state.leader).toBe(3);
    expect(elected.state.nodes.filter((node) => node.votedFor === 3)).toHaveLength(4);
    const last = steps.at(-1)!;
    expect(last.kind).toBe("result");
    expect(last.state.nodes[0]).toMatchObject({ role: "follower", term: 2 });
    expect(last.state.nodes.filter((node) => node.role === "leader")).toHaveLength(1);
    expect(last.interview).toContain("higher term always wins");
    expect(steps).toEqual(raftElectionSteps({ nodes: 5, first: 3, failure: "crash" }));
  });

  it("keeps a partitioned leader alive but unable to commit, then steps it down", () => {
    const steps = raftElectionSteps({ nodes: 3, first: 2, failure: "partition" });
    const failed = steps.find((step) => step.state.phase === "failed")!;
    expect(failed.state.nodes[0]).toMatchObject({ role: "leader", cutOff: true });
    expect(failed.state.messages.every((message) => message.kind === "lost")).toBe(true);
    const elected = steps.find((step) => step.state.phase === "elected")!;
    expect(elected.state.votes).toBe(2);
    expect(elected.state.majority).toBe(2);
    const back = steps.find((step) => step.state.phase === "return")!;
    expect(back.kind).toBe("tradeoff");
    expect(back.state.nodes.filter((node) => node.role === "leader")).toHaveLength(2);
    expect(back.state.messages.some((message) => message.kind === "stale")).toBe(true);
    expect(steps.at(-1)!.state.nodes[0]).toMatchObject({ role: "follower", term: 2, cutOff: false });
  });

  it("never lets the old leader be the first timer and parses per field", () => {
    expect(raftElectionSteps({ nodes: 3, first: 1, failure: "crash" }).find((step) => step.state.phase === "timeout")!.state.candidate).toBe(2);
    expect(raftElectionViz.parse({})).toEqual(raftElectionViz.defaults);
    expect(raftElectionViz.parse({ nodes: "3", first: "9", failure: "partition" })).toEqual({ nodes: 3, first: 3, failure: "partition" });
    expect(raftElectionViz.parse({ nodes: 4, first: "x", failure: "nope" })).toEqual({ nodes: 5, first: 3, failure: "crash" });
    expect(raftElectionViz.parse({ partitioned: true })).toEqual({ ...raftElectionViz.defaults, failure: "partition" });
  });
});
