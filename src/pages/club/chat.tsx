import { useEffect } from "react";

export default function ClubChat() {
  useEffect(() => {
    import("https://cdn.jsdelivr.net/npm/@chatvolt/embeds@latest/dist/chatbox/index.js").then((module: any) => {
      module.default.initStandard({
        agentId: "cm9ai7tb50kjcf2m6vgttet8f",
      });
    });
  }, []);

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Futebot</h1>
      <p className="mb-4 text-gray-600">Tire dúvidas, converse com o suporte ou envie sugestões diretamente pelo chat abaixo.</p>
      <chatvolt-chatbox-standard style={{ width: "100%", height: "650px" }} />
    </div>
  );
}
