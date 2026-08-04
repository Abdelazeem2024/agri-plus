/// <reference types="vite/client" />

declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.ttf' {
  const src: string;
  export default src;
}
