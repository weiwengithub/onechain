type ValueOf<T> = T[keyof T];

declare module '*.json' {
  const value: unknown;
  export default value;
}
