import type { AnyVizDefinition } from "./types";

import { architectureViz } from "./architecture";
import { invertedIndexViz } from "./inverted-index";
import { streamWindowViz } from "./stream-window";
import { snowflakeIdViz } from "./snowflake-id";
import { bloomFilterViz } from "./bloom-filter";
import { geohashViz } from "./geohash";
import { dnsResolutionViz } from "./dns-resolution";
import { tlsHandshakeViz } from "./tls-handshake";
import { cdnEdgeViz } from "./cdn-edge";
import { lsmTreeViz } from "./lsm-tree";
import { btreeLookupViz } from "./btree-lookup";
import { raftElectionViz } from "./raft-election";
import { twoPhaseVsSagaViz } from "./two-phase-vs-saga";
import { regionFailoverViz } from "./region-failover";

/** Visualizers added after the first set. Each one replaces its own slot line; never touch another slot. */
export const MORE_VIZ: AnyVizDefinition[] = [
  architectureViz,
  invertedIndexViz,
  streamWindowViz,
  snowflakeIdViz,
  bloomFilterViz,
  geohashViz,
  dnsResolutionViz,
  tlsHandshakeViz,
  cdnEdgeViz,
  lsmTreeViz,
  btreeLookupViz,
  raftElectionViz,
  twoPhaseVsSagaViz,
  regionFailoverViz,
];
