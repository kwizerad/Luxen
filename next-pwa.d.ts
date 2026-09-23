declare module "next-pwa" {
  import { NextConfig } from "next";
  function withPWA(config: object): (config: NextConfig) => NextConfig;
  export default withPWA;
}
