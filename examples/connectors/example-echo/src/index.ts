import { createAction, createPiece, PieceAuth, Property } from '@activepieces/pieces-framework';

// One action that returns its input. It needs no network access, so egressHosts stays empty.
const echo = createAction({
  name: 'echo',
  displayName: 'Echo',
  description: 'Returns the text you send.',
  props: {
    text: Property.ShortText({ displayName: 'Text', required: true }),
  },
  async run({ propsValue }) {
    return { text: propsValue.text, receivedAt: new Date().toISOString() };
  },
});

export const exampleEcho = createPiece({
  displayName: 'Example echo',
  description: 'Echoes its input back. Useful to test connector install.',
  auth: PieceAuth.None(),
  minimumSupportedRelease: '0.30.0',
  logoUrl: 'https://cdn.example.com/example-echo.png',
  authors: ['acme'],
  actions: [echo],
  triggers: [],
});
