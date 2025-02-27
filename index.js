javascript

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Check authorization token (now from environment variable)
  const auth = request.headers.get('Authorization');
  if (auth !== `Bearer ${WORKER_SECRET_TOKEN}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Parse the request body (expecting JSON with a 'prompt' field)
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return new Response('Invalid JSON', { status: 400 });
  }

  // Extract and sanitize the prompt, escaping special characters
  let prompt = body.prompt || '';
  if (typeof prompt !== 'string') {
    return new Response('Prompt must be a string', { status: 400 });
  }

  // Limit prompt length
  if (prompt.length > 100) {
    return new Response('Prompt too long', { status: 400 });
  }

  // Escape special characters (e.g., ^, :, etc.) to prevent issues in prompts
  prompt = prompt
    .replace(/\^/g, '\\^')  // Escape caret ^
    .replace(/:/g, '\\:')   // Escape colon :
    .replace(/"/g, '\\"')   // Escape double quotes
    .replace(/\n/g, '\\n'); // Escape newlines

  // Forward the request to RunPod with the sanitized prompt
  try {
    const response = await fetch('https://api.runpod.ai/v2/qo5iugc2gfl1lx/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RUNPOD_API_KEY}`
      },
      body: JSON.stringify({ input: { prompt: prompt, steps: 30 } })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(`RunPod error: ${errorText}`, { status: response.status });
    }

    // Parse and return the response (assuming JSON with an image output, like base64)
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response('Network error: Unable to reach RunPod', { status: 502 });
  }
}

