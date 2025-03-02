'use client';

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon, Type, Music, X, LetterText, Clock, Blend, Palette, Layers, SlidersHorizontal, Expand, MoveHorizontal } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

interface Settings {
  showplayercontrol: boolean;
  fullplayer: boolean;
  fontSize: 'small' | 'medium' | 'large';
  lyricposition: 'left' | 'center' | 'right';
  backgroundblur: 'none' | 'small' | 'medium' | 'large';
  backgroundtransparency: 'none' | 'small' | 'medium' | 'large';
  theme: 'system' | 'dark' | 'light';
  playerposition: 'left' | 'center' | 'right';
  volume: number;
  lyricOffset: number;
}

interface SettingsSidebarProps {
  showSettings: boolean;
  setShowSettings: (value: boolean) => void;
  settings: Settings;
  handleSettingChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  isMobile: boolean;
}

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  showSettings,
  setShowSettings,
  settings,
  handleSettingChange,
  isMobile,
}) => {
  if (isMobile) {
    return (
      <MobileSettingsView
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        settings={settings}
        handleSettingChange={handleSettingChange}
      />
    );
  }

  // デスクトップ用
  return (
    <Sheet open={showSettings} onOpenChange={setShowSettings}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <SettingsIcon className="h-5 w-5" />
            設定
          </SheetTitle>
          <SheetDescription>
            表示設定とプレーヤー設定をカスタマイズできます
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="display" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="display" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              <span>表示設定</span>
            </TabsTrigger>
            <TabsTrigger value="player" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              <span>プレーヤー設定</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="display" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md">レイアウトと表示</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fontSize" className="text-sm font-medium flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      フォントサイズ
                    </Label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { value: 'small', label: '小' },
                        { value: 'medium', label: '中' },
                        { value: 'large', label: '大' }
                      ].map((option) => (
                        <Button
                          key={option.value}
                          variant={settings.fontSize === option.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleSettingChange('fontSize', option.value as 'small' | 'medium' | 'large')}
                          className="flex-1"
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="lyricposition" className="text-sm font-medium flex items-center gap-2">
                    <LetterText className="h-4 w-4" />
                      歌詞位置
                    </Label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { value: 'left', label: '左' },
                        { value: 'center', label: '中央' },
                        { value: 'right', label: '右' }
                      ].map((option) => (
                        <Button
                          key={option.value}
                          variant={settings.lyricposition === option.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleSettingChange('lyricposition', option.value as 'left' | 'center' | 'right')}
                          className="flex-1"
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <TooltipProvider>
                    <div className="space-y-2">
                      <Label htmlFor="lyricOffset" className="text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        歌詞タイミング調整（秒）
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">歌詞のタイミングを調整します。プラス値は歌詞が早く表示され、マイナス値は遅く表示されます。</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="lyricOffset"
                        type="number"
                        step="0.1"
                        value={settings.lyricOffset}
                        onChange={(e) => {
                          const newOffset = Number(e.target.value);
                          handleSettingChange('lyricOffset', newOffset);
                        }}
                        className="mt-1"
                      />
                      <div className="mt-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          プラス値: 歌詞が早く表示
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          マイナス値: 歌詞が遅く表示
                        </p>
                      </div>
                    </div>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md">視覚効果</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="backgroundblur" className="text-sm font-medium flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    背景ぼかし
                  </Label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { value: 'none', label: 'なし' },
                      { value: 'small', label: '小' },
                      { value: 'medium', label: '中' },
                      { value: 'large', label: '大' }
                    ].map((option) => (
                      <Button
                        key={option.value}
                        variant={settings.backgroundblur === option.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSettingChange('backgroundblur', option.value as 'none' | 'small' | 'medium' | 'large')}
                        className="flex-1"
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="backgroundtransparency" className="text-sm font-medium flex items-center gap-2">
                    <Blend className="h-4 w-4" />
                    背景透明度
                  </Label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { value: 'none', label: 'なし' },
                      { value: 'small', label: '低' },
                      { value: 'medium', label: '中' },
                      { value: 'large', label: '高' }
                    ].map((option) => (
                      <Button
                        key={option.value}
                        variant={settings.backgroundtransparency === option.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSettingChange('backgroundtransparency', option.value as 'none' | 'small' | 'medium' | 'large')}
                        className="flex-1"
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="theme" className="text-sm font-medium flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    テーマ
                  </Label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { value: 'dark', label: 'ダーク' },
                      { value: 'light', label: 'ライト' },
                      { value: 'system', label: 'システム' }
                    ].map((option) => (
                      <Button
                        key={option.value}
                        variant={settings.theme === option.value ? "default" : "outline"}
                        onClick={() =>
                          handleSettingChange('theme', option.value as 'dark' | 'light' | 'system')
                        }
                        className="flex-1"
                        size="sm"
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="player" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md">プレーヤー設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="showplayercontrol" className="text-sm font-medium flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    プレーヤーコントロールを表示
                  </Label>
                  <Switch
                    id="showplayercontrol"
                    checked={settings.showplayercontrol}
                    onCheckedChange={(checked) => handleSettingChange('showplayercontrol', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label htmlFor="fullplayer" className="text-sm font-medium flex items-center gap-2">
                    <Expand className="h-4 w-4" />
                    フルプレーヤー
                  </Label>
                  <Switch
                    id="fullplayer"
                    checked={settings.fullplayer}
                    onCheckedChange={(checked) => handleSettingChange('fullplayer', checked)}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="playerposition" className="text-sm font-medium flex items-center gap-2">
                    <MoveHorizontal className="h-4 w-4" />
                    プレーヤー位置
                    {settings.fullplayer && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>フルプレーヤーモードでは位置の変更ができません</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </Label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { value: 'left', label: '左' },
                      { value: 'center', label: '中央' },
                      { value: 'right', label: '右' }
                    ].map((option) => (
                      <Button
                        key={option.value}
                        variant={settings.playerposition === option.value ? "default" : "outline"}
                        onClick={() =>
                          !settings.fullplayer && 
                          handleSettingChange('playerposition', option.value as 'left' | 'center' | 'right')
                        }
                        className="flex-1"
                        disabled={settings.fullplayer}
                        size="sm"
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

// モバイル用
const MobileSettingsView: React.FC<Omit<SettingsSidebarProps, 'isMobile'>> = ({
  showSettings,
  setShowSettings,
  settings,
  handleSettingChange,
}) => {
  return (
    <Sheet open={showSettings} onOpenChange={setShowSettings}>
      <SheetContent side="bottom" className="h-[85vh] max-h-[85vh] pb-8 rounded-t-xl">
        <div className="absolute top-0 left-0 right-0 flex justify-center py-2">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>
        <SheetTitle className="flex items-center gap-2 text-xl">
          <SettingsIcon className="h-5 w-5" />
          設定
        </SheetTitle>
        
        <div className="overflow-y-auto h-full pb-8">
          <Tabs defaultValue="display" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 sticky top-0 z-10 bg-background">
              <TabsTrigger value="display" className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                <span>表示設定</span>
              </TabsTrigger>
              <TabsTrigger value="player" className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                <span>プレーヤー設定</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="display" className="space-y-4 pb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">レイアウトと表示</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="fontSize" className="text-sm font-medium flex items-center gap-2 mb-2">
                        <Type className="h-4 w-4" />
                        フォントサイズ
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: 'small', label: '小' },
                          { value: 'medium', label: '中' },
                          { value: 'large', label: '大' }
                        ].map((option) => (
                          <Button
                            key={option.value}
                            variant={settings.fontSize === option.value ? "default" : "outline"}
                            onClick={() => handleSettingChange('fontSize', option.value as 'small' | 'medium' | 'large')}
                            className="w-full py-3"
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label htmlFor="lyricposition" className="text-sm font-medium flex items-center gap-2 mb-2">
                        <LetterText className="h-4 w-4" />
                        歌詞位置
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: 'left', label: '左' },
                          { value: 'center', label: '中央' },
                          { value: 'right', label: '右' }
                        ].map((option) => (
                          <Button
                            key={option.value}
                            variant={settings.lyricposition === option.value ? "default" : "outline"}
                            onClick={() => handleSettingChange('lyricposition', option.value as 'left' | 'center' | 'right')}
                            className="w-full py-3"
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="lyricOffset" className="text-sm font-medium flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4" />
                        歌詞タイミング調整（秒）
                      </Label>
                      <Input
                        id="lyricOffset"
                        type="number"
                        step="0.1"
                        value={settings.lyricOffset}
                        onChange={(e) => {
                          const newOffset = Number(e.target.value);
                          handleSettingChange('lyricOffset', newOffset);
                        }}
                        className="mb-2"
                      />
                      <div className="mt-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          プラス値: 歌詞が早く表示
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          マイナス値: 歌詞が遅く表示
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">視覚効果</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="backgroundblur" className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      背景ぼかし
                    </Label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { value: 'none', label: 'なし' },
                        { value: 'small', label: '小' },
                        { value: 'medium', label: '中' },
                        { value: 'large', label: '大' }
                      ].map((option) => (
                        <Button
                          key={option.value}
                          variant={settings.backgroundblur === option.value ? "default" : "outline"}
                          onClick={() => handleSettingChange('backgroundblur', option.value as 'none' | 'small' | 'medium' | 'large')}
                          className="w-full py-3"
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label htmlFor="backgroundtransparency" className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Blend className="h-4 w-4" />
                      背景透明度
                    </Label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { value: 'none', label: 'なし' },
                        { value: 'small', label: '低' },
                        { value: 'medium', label: '中' },
                        { value: 'large', label: '高' }
                      ].map((option) => (
                        <Button
                          key={option.value}
                          variant={settings.backgroundtransparency === option.value ? "default" : "outline"}
                          onClick={() => handleSettingChange('backgroundtransparency', option.value as 'none' | 'small' | 'medium' | 'large')}
                          className="w-full py-3"
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label htmlFor="theme" className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      テーマ
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'dark', label: 'ダーク' },
                        { value: 'light', label: 'ライト' },
                        { value: 'system', label: 'システム' }
                      ].map((option) => (
                        <Button
                          key={option.value}
                          variant={settings.theme === option.value ? "default" : "outline"}
                          onClick={() => handleSettingChange('theme', option.value as 'dark' | 'light' | 'system')}
                          className="w-full py-3"
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="player" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">プレーヤー設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between py-2">
                    <Label htmlFor="showplayercontrol" className="text-sm font-medium flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      プレーヤーコントロールを表示
                    </Label>
                    <Switch
                      id="showplayercontrol"
                      checked={settings.showplayercontrol}
                      onCheckedChange={(checked) => handleSettingChange('showplayercontrol', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between py-2">
                    <Label htmlFor="fullplayer" className="text-sm font-medium flex items-center gap-2">
                      <Expand className="h-4 w-4" />
                      フルプレーヤー
                    </Label>
                    <Switch
                      id="fullplayer"
                      checked={true}
                      disabled={true}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground bg-secondary p-2 rounded">
                    モバイルデバイスではフルプレーヤーのみ対応しています
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="playerposition" className="text-sm font-medium flex items-center gap-2 mb-2">
                      <MoveHorizontal className="h-4 w-4" />
                      プレーヤー位置
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'left', label: '左' },
                        { value: 'center', label: '中央' },
                        { value: 'right', label: '右' }
                      ].map((option) => (
                        <Button
                          key={option.value}
                          variant={settings.playerposition === option.value ? "default" : "outline"}
                          className="w-full py-3"
                          disabled
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                    <div className="text-sm text-muted-foreground bg-secondary p-2 rounded">
                      フルプレーヤーモードでは位置の変更ができません
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SettingsSidebar;