import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gitset v2',
    short_name: 'Gitset',
    description: 'The next generation of Gitset is here.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: '/favicon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/favicon-72.png',
        sizes: '72x72',
        type: 'image/png',
      },
      {
        src: '/favicon-96.png',
        sizes: '96x96',
        type: 'image/png',
      },
      {
        src: '/favicon-144-precomposed.png',
        sizes: '144x144',
        type: 'image/png',
      },
      {
        src: '/globe.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      }
    ],
  }
}
