import { Protocol, ClmmProtocol } from "../constants";

import {
  CetusPositionProvider,
  FlowXPositionProvider,
  IPositionProvider,
  PositionManager,
  CetusPositionManager,
  FlowXPositionManager,
} from "./position";

export const createPositionProvider = (
  protocol: ClmmProtocol
): IPositionProvider => {
  switch (protocol) {
    case Protocol.CETUS:
      return new CetusPositionProvider();
    case Protocol.FLOWX_V3:
      return new FlowXPositionProvider();
    default:
      throw new Error(`Unsupported protocol: ${protocol}`);
  }
};

export const createPositionManager = (
  protocol: ClmmProtocol
): PositionManager => {
  switch (protocol) {
    case Protocol.CETUS:
      return new CetusPositionManager();
    case Protocol.FLOWX_V3:
      return new FlowXPositionManager();
    default:
      throw new Error(`Unsupported protocol: ${protocol}`);
  }
};
