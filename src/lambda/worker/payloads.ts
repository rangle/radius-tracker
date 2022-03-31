import { APIGatewayProxyEvent } from "aws-lambda";
import { Volume } from "memfs";

export interface TrackerEvent extends APIGatewayProxyEvent {
  body: string, // Github repo url
}

export type NodeRef = {
  text: string,
  startLine: number,
  endLine: number,
  filepath: string,
  context?: string,
  url: string,
};

export type TrackerWarning = {
  type: string,
  message: string,
  node?: NodeRef,
};

export type TrackerUsageData = {
  target: NodeRef,
  usages: TrackerUsage[],
};
export type TrackerUsage = {
  use: NodeRef,
  trace: TrackerTrace[],
  aliasPath: string[],
};
export type TrackerTrace = {
  type: string,
  node: NodeRef,
};

export type TrackerResponse = {
  warnings: TrackerWarning[],
  snowflakeUsages: TrackerUsageData[],
};

type TrackerResponseSuccess = { statusCode: 200, payload: TrackerResponse };
type TrackerResponseFailure = { statusCode: 400, message: string };
export type TrackerResponseMessage = TrackerResponseSuccess | TrackerResponseFailure;

export type MemfsVolume = ReturnType<(typeof Volume)["fromJSON"]>;
