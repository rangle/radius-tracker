import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
} from "aws-lambda";

module.exports.handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log("Event: ", event);
    const responseMessage = "Hello, World!";

    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            message: responseMessage,
        }),
    };
};
