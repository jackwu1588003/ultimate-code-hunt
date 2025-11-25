import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import GameStart from "./pages/GameStart";
import GameBoard from "./pages/GameBoard";
import GameResult from "./pages/GameResult";
import Stats from "./pages/Stats";
import NotFound from "./pages/NotFound";

import RoomLobby from "./pages/RoomLobby";
import RoomWaiting from "./pages/RoomWaiting";
import { ThemeProvider } from "./components/ThemeProvider";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<GameStart />} />
            <Route path="/game" element={<GameBoard />} />
            <Route path="/result" element={<GameResult />} />

            <Route path="/stats" element={<Stats />} />
            <Route path="/lobby" element={<RoomLobby />} />
            <Route path="/room/:roomId" element={<RoomWaiting />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
