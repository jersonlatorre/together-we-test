export default {
  root: 'public',
  server: {
    port: 8080,
    open: true,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
  watch: {
    usePolling: true,
  },
}
