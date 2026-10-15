const worker = {
  async fetch() {
    return new Response("Connector preview is unavailable.", { status: 501 });
  },
};

export default worker;
export const ConnectorPreview = worker;
