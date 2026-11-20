export type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

/** Fails to compile unless `T` is `true`, so an `any` that leaks in is caught. */
export type Assert<T extends true> = T;
