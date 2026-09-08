import { render } from '@testing-library/react-native';
import LegalWebViewScreen from '../LegalWebViewScreen';

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: (props: { source: { uri: string } }) => <View testID="webview" {...props} /> };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function routeWith(page: 'terms' | 'privacy' | 'dataDeletion'): any {
  return { route: { params: { page } } };
}

describe('LegalWebViewScreen', () => {
  it.each([
    ['terms', 'https://www.tonnkama.com/terms-of-use'],
    ['privacy', 'https://www.tonnkama.com/privacy-policy'],
    ['dataDeletion', 'https://www.tonnkama.com/data-deletion'],
  ] as const)('charge la bonne URL pour la page "%s"', async (page, expectedUrl) => {
    const { getByTestId } = await render(<LegalWebViewScreen {...routeWith(page)} />);
    expect(getByTestId('webview').props.source.uri).toBe(expectedUrl);
  });
});
