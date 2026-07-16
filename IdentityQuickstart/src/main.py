"""
AgentCore Identity Outbound Token Agent

This agent demonstrates the USER_FEDERATION OAuth 2.0 flow.

It handles the OAuth 2.0 user consent flow and inspects the resulting OAuth 2.0 access token.
"""

from bedrock_agentcore.runtime import BedrockAgentCoreApp
from bedrock_agentcore.identity import requires_access_token
import asyncio
import jwt
import logging

app = BedrockAgentCoreApp()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def decode_jwt(token):
    try:
        decoded = jwt.decode(token, options={"verify_signature": False})
        return decoded
    except Exception as e:
        return {"error": f"Error decoding JWT: {str(e)}"}

class StreamingQueue:
    def __init__(self):
        self.finished = False
        self.queue = asyncio.Queue()

    async def put(self, item):
        await self.queue.put(item)

    async def finish(self):
        self.finished = True
        await self.queue.put(None)

    async def stream(self):
        while True:
            item = await self.queue.get()
            if item is None and self.finished:
                break
            yield item

queue = StreamingQueue()

async def handle_auth_url(url):
    await queue.put(f"Authorization URL, please copy to your preferred browser: {url}")

@requires_access_token(
    provider_name="AgentCoreIdentityQuickStartProvider",
    scopes=["openid"],
    auth_flow="USER_FEDERATION",
    on_auth_url=handle_auth_url, # streams authorization URL to client
    force_authentication=True,
    callback_url='insert_oauth2_callback_url_for_session_binding',
)
async def introspect_with_decorator(*, access_token: str):
    """Introspect token using decorator"""
    logger.info("Inside introspect_with_decorator - decorator succeeded")
    await queue.put({
        "message": "Successfully received an access token to act on behalf of your user!",
        "token_claims": decode_jwt(access_token),
        "token_length": len(access_token),
        "token_preview": f"{access_token[:50]}...{access_token[-10:]}"
    })
    await queue.finish()

@app.entrypoint
async def agent_invocation(payload, context):
    """Handler that uses only the decorator approach"""
    logger.info("Agent invocation started")

    # Start the agent task and immediately begin streaming
    task = asyncio.create_task(introspect_with_decorator())

    # Stream items as they come in
    async for item in queue.stream():
        yield item

    # Wait for task completion
    await task

if __name__ == "__main__":
    app.run()