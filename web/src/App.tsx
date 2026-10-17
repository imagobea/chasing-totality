import { ApiStatus } from "./ApiStatus.js";
import { EclipseMap } from "./EclipseMap.js";

export function App() {
  return (
    <>
      <h1>Chasing totality</h1>
      <ApiStatus />
      <EclipseMap />
    </>
  );
}
