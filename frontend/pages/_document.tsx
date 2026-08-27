import { ServerStyleSheet } from 'styled-components';
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';
import Document, {
  Html,
  Head,
  Main,
  NextScript,
  DocumentContext,
} from 'next/document';

function MainDocument() {
  return (
    <Html>
      <Head />
      <body>
        <Main />
        <NextScript />
        <div id="modal-root"></div>
      </body>
    </Html>
  );
}

MainDocument.getInitialProps = async (ctx: DocumentContext) => {
  const sheet = new ServerStyleSheet();
  const cache = createCache();
  const originalRenderPage = ctx.renderPage;

  try {
    ctx.renderPage = () =>
      originalRenderPage({
        enhanceApp: (App) => (props) =>
          sheet.collectStyles(
            <StyleProvider cache={cache}>
              <App {...props} />
            </StyleProvider>
          ),
      });

    const initialProps = await Document.getInitialProps(ctx);
    return {
      ...initialProps,
      styles: (
        <>
          {initialProps.styles}
          {sheet.getStyleElement()}
          <style dangerouslySetInnerHTML={{ __html: extractStyle(cache) }} />
        </>
      ),
    };
  } finally {
    sheet.seal();
  }
};

export default MainDocument;
