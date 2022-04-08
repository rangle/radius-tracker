import {
    APIGatewayProxyResult,
    APIGatewayProxyEvent,
} from "aws-lambda";

interface TrackerEvent extends APIGatewayProxyEvent {
    body: string, // Github repo url
}

exports.handler = async (event: TrackerEvent): Promise<APIGatewayProxyResult> => {
    console.log("EVENT\n" + JSON.stringify(event));
    return { statusCode: 200, body: "success" };
};
