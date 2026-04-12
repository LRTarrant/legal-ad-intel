declare module "react-simple-maps" {
  import { ComponentType, CSSProperties, ReactNode } from "react";

  interface ProjectionConfig {
    rotate?: [number, number, number];
    center?: [number, number];
    parallels?: [number, number];
    scale?: number;
  }

  interface ComposableMapProps {
    projection?: string;
    projectionConfig?: ProjectionConfig;
    width?: number;
    height?: number;
    style?: CSSProperties;
    children?: ReactNode;
  }

  interface GeographiesChildrenArgs {
    geographies: Array<{
      rsmKey: string;
      id: string;
      type: string;
      properties: Record<string, string>;
      geometry: unknown;
    }>;
  }

  interface GeographiesProps {
    geography: string | Record<string, unknown>;
    children: (args: GeographiesChildrenArgs) => ReactNode;
  }

  interface GeographyStyleProps {
    default?: CSSProperties;
    hover?: CSSProperties;
    pressed?: CSSProperties;
  }

  interface GeographyProps {
    geography: unknown;
    key?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: GeographyStyleProps;
    children?: ReactNode;
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: (e: React.MouseEvent) => void;
    onClick?: (e: React.MouseEvent) => void;
  }

  export const ComposableMap: ComponentType<ComposableMapProps>;
  export const Geographies: ComponentType<GeographiesProps>;
  export const Geography: ComponentType<GeographyProps>;
  export const Marker: ComponentType<Record<string, unknown>>;
  export const Line: ComponentType<Record<string, unknown>>;
  export const Graticule: ComponentType<Record<string, unknown>>;
  export const Sphere: ComponentType<Record<string, unknown>>;
  export const ZoomableGroup: ComponentType<Record<string, unknown>>;
  export const Annotation: ComponentType<Record<string, unknown>>;
}
