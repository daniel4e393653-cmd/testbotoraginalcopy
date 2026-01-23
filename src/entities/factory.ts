import { Protocol } from "@flowx-finance/sdk";
import { ClmmProtocol } from "../constants";

import {
  FlowXV3PositionProvider,
  CetusPositionProvider,
  IPositionProvider,
  PositionManager,
  FlowXV3PositionManager,
  CetusPositionManager,
} from "./position";

export const createPositionProvider = (
  protocol: ClmmProtocol
): IPositionProvider => {
  switch (protocol) {
    case Protocol.FLOWX_V3:
      return new FlowXV3PositionProvider();
    case Protocol.CETUS:
      return new CetusPositionProvider();
    default:
      throw new Error(`Unsupported protocol: ${protocol}`);
  }
};

export const createPositionManager = (
  protocol: ClmmProtocol
): PositionManager => {
  switch (protocol) {
    case Protocol.FLOWX_V3:
      return new FlowXV3PositionManager();
    case Protocol.CETUS:
      return new CetusPositionManager();
    default:
      throw new Error(`Unsupported protocol: ${protocol}`);
  }
};

