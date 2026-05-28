'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Bot, Sparkles, TrendingUp, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface Recommendation {
  id: string;
  type: 'budget' | 'audience' | 'creative' | 'bid' | 'schedule';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  campaignId: string;
  campaignName: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
}

const mockRecommendations: Recommendation[] = [
  {
    id: '1',
    type: 'budget',
    title: 'Increase Budget for High-Performing Campaign',
    description: 'Campaign "Summer Sale 2024" has a ROAS of 4.5x. Increasing budget by 20% could yield an additional $12,000 in revenue.',
    confidence: 92,
    impact: 'high',
    campaignId: 'camp-1',
    campaignName: 'Summer Sale 2024',
    status: 'pending',
  },
  {
    id: '2',
    type: 'audience',
    title: 'Refine Audience Targeting',
    description: 'Age group 25-34 shows 3x higher conversion rate. Consider narrowing targeting to focus budget on this segment.',
    confidence: 87,
    impact: 'medium',
    campaignId: 'camp-2',
    campaignName: 'Brand Awareness Q3',
    status: 'pending',
  },
  {
    id: '3',
    type: 'creative',
    title: 'Refresh Ad Creative',
    description: 'Creative fatigue detected after 45 days. CTR has dropped 15%. New creative variants recommended.',
    confidence: 78,
    impact: 'high',
    campaignId: 'camp-3',
    campaignName: 'Product Launch',
    status: 'pending',
  },
];

export function AIAgentContent() {
  const [activeTab, setActiveTab] = useState('recommendations');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            AI Agent
          </h1>
          <p className="text-muted-foreground">AI-powered recommendations and optimizations.</p>
        </div>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Recommendations
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          {mockRecommendations.map((rec) => (
            <RecommendationCard key={rec.id} recommendation={rec} />
          ))}
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>Performance Insights</CardTitle>
              <CardDescription>AI-generated analysis of your account performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <InsightItem
                icon={TrendingUp}
                title="Revenue Opportunity"
                description="You could increase revenue by 23% by implementing the top 5 budget recommendations."
                type="positive"
              />
              <InsightItem
                icon={AlertTriangle}
                title="Creative Fatigue Alert"
                description="3 campaigns show signs of creative fatigue. Consider refreshing creatives within 7 days."
                type="warning"
              />
              <InsightItem
                icon={CheckCircle}
                title="Audience Optimization"
                description="Your audience targeting is performing 15% above industry benchmark."
                type="positive"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Action History</CardTitle>
              <CardDescription>Previously applied AI recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No actions taken yet.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>AI Agent Settings</CardTitle>
              <CardDescription>Configure recommendation preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-apply low-risk changes</p>
                  <p className="text-sm text-muted-foreground">Automatically apply recommendations with confidence &gt; 90%</p>
                </div>
                <Button variant="outline">Configure</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Notification preferences</p>
                  <p className="text-sm text-muted-foreground">Choose how you want to be notified about new recommendations</p>
                </div>
                <Button variant="outline">Configure</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RecommendationCard({ recommendation: rec }: { recommendation: Recommendation }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant={rec.impact === 'high' ? 'destructive' : rec.impact === 'medium' ? 'default' : 'secondary'}>
                {rec.impact} impact
              </Badge>
              <Badge variant="outline">{rec.type}</Badge>
              <span className="text-sm text-muted-foreground">{rec.campaignName}</span>
            </div>
            <h3 className="font-semibold">{rec.title}</h3>
            <p className="text-sm text-muted-foreground">{rec.description}</p>
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">Confidence:</span>
                <span className="text-sm">{rec.confidence}%</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 ml-4">
            <Button size="sm" variant="outline">Reject</Button>
            <Button size="sm">Approve</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightItem({
  icon: Icon,
  title,
  description,
  type,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  type: 'positive' | 'warning' | 'negative';
}) {
  const colors = {
    positive: 'text-emerald-600 bg-emerald-50',
    warning: 'text-amber-600 bg-amber-50',
    negative: 'text-red-600 bg-red-50',
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border p-4">
      <div className={`rounded-full p-2 ${colors[type]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
