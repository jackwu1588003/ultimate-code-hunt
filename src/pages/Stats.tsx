import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { gameApi } from "@/services/gameApi";
import { Trophy, User, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Stats = () => {
    const navigate = useNavigate();
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const data = await gameApi.getLeaderboard();
                setLeaderboard(data.leaderboard);
            } catch (error) {
                console.error("Failed to fetch leaderboard:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    return (
        <div className="min-h-screen bg-game-gradient p-4">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-4xl font-bold text-primary">遊戲戰績</h1>
                    <Button onClick={() => navigate("/")} variant="outline">
                        返回首頁
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="w-6 h-6 text-yellow-500" />
                            排行榜
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {loading ? (
                                <div className="text-center py-8">載入中...</div>
                            ) : (
                                <div className="grid gap-4">
                                    {leaderboard.map((player, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-4 bg-card/50 rounded-lg border"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 flex items-center justify-center font-bold text-xl text-muted-foreground">
                                                    #{index + 1}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-lg">{player.nickname || player.username}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        勝率: {player.win_rate}% | 場次: {player.total_games}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-success">{player.total_wins} 勝</div>
                                                <div className="text-sm text-danger">{player.total_losses} 敗</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Stats;
