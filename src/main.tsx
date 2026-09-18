import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

// Hình nền nằm trong App (components/Backdrop): nó cần biết lựa chọn trong
// popup cài đặt và biết lúc nào đang kéo thẻ để đứng yên.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
