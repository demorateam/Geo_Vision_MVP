declare module "@neshan-maps-platform/leaflet" {
  import * as L from "leaflet";
  export = L;
}

declare module "leaflet" {
  interface MapOptions {
    key?: string;
    maptype?: string;
    poi?: boolean;
    traffic?: boolean;
  }
}