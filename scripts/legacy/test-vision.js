async function test() {
  const pixel = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
  
  const payload = {
    events: [
      { visitorId: "test-bot-1", sessionId: "test-bot-1", variantId: "hero_a_001", eventType: "page_view", timestamp: new Date().toISOString() }
    ],
    isExit: true,
    startImage: pixel,
    latestImage: pixel
  };

  const res = await fetch('https://darwins.pages.dev/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}

test();
