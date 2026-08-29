import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* Nền mesh: nguồn màu cho mọi lớp kính phía trên. Nằm ngoài App vì
        nó là vật liệu của cả trang, không phải một phần của bảng. */}
    <div className="mesh" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
    <App />
  </StrictMode>
);
