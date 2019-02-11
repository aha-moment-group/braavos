declare module 'superagent-http-signature' {
  import { Plugin } from 'superagent';

  export default function signature(_: any): Plugin;
}
