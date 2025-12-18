import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

/**
 * This file is web-only and used to configure the root HTML for every web page during static rendering.
 * The contents of this file are only used in production builds.
 */
export default function Root({ children }: PropsWithChildren) {
    return (
        <html lang="id">
            <head>
                <meta charSet="utf-8" />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, shrink-to-fit=no"
                />
                <title>PingpongHub</title>

                {/* Preload and load Material Icons font from CDN */}
                <link
                    rel="preconnect"
                    href="https://fonts.googleapis.com"
                />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin="anonymous"
                />
                {/* Material Icons font - using the exact font from @expo/vector-icons */}
                <style
                    dangerouslySetInnerHTML={{
                        __html: `
                            @font-face {
                                font-family: 'MaterialIcons';
                                font-style: normal;
                                font-weight: 400;
                                src: url(/fonts/MaterialIcons.ttf) format('truetype');
                            }
                            @font-face {
                                font-family: 'Material Icons';
                                font-style: normal;
                                font-weight: 400;
                                src: url(/fonts/MaterialIcons.ttf) format('truetype');
                            }
                        `,
                    }}
                />

                {/* Disable body scrolling on web to make ScrollView work correctly */}
                <ScrollViewStyleReset />
            </head>
            <body>{children}</body>
        </html>
    );
}
