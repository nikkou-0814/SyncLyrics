'use client';

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon, Type, Music, LetterText, Clock, Blend, Palette, Layers, SlidersHorizontal, Expand, MoveHorizontal, MicVocal, ArrowUpWideNarrow, Spline, FileText, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { SettingsSidebarProps } from '@/types';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { SiGithub } from 'react-icons/si';

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
    <TooltipProvider>
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
              <Alert variant="default" className="bg-green-100 border-green-500 dark:bg-green-950/50 dark:border-green-600/50 mb-4">
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <AlertTitle className="text-green-700 dark:text-green-300 font-medium">AMLLの使用を推奨</AlertTitle>
                </div>
                <AlertDescription className="text-green-700 dark:text-green-300 mt-1 pl-7">
                  標準機能よりも遥かに優れた同期表示が可能です！
                </AlertDescription>
              </Alert>
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
                        {settings.useAMLL && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">AMLLがオンの場合は使用できません（自動調整されます）</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
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
                            disabled={settings.useAMLL}
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
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="lyricOffset" className="text-sm font-medium flex items-center gap-2">
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

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="useKaraokeLyric" className="text-sm font-medium flex items-center gap-2">
                      <MicVocal className="h-4 w-4" />
                      カラオケ風歌詞
                      {settings.useAMLL && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">AMLLがオンの場合は使用できません</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </Label>
                    <Switch
                      id="useKaraokeLyric"
                      checked={settings.useKaraokeLyric}
                      onCheckedChange={(checked) => handleSettingChange('useKaraokeLyric', checked)}
                      disabled={settings.useAMLL}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <ArrowUpWideNarrow className="h-4 w-4" />
                      カラオケ風歌詞進行方向
                      {(!settings.useKaraokeLyric || settings.useAMLL) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                        </TooltipTrigger>
                        <TooltipContent>
                        <p className="max-w-xs">
                          {!settings.useKaraokeLyric && "カラオケ風歌詞がオフの場合は使用できません"}
                          {settings.useAMLL && "AMLLがオンの場合は使用できません"}
                        </p>
                        </TooltipContent>
                      </Tooltip>
                      )}
                    </Label>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                      { value: 'rtl', label: '右→左' },
                      { value: 'ltr', label: '左→右' },
                      { value: 'btt', label: '下→上' },
                      { value: 'ttb', label: '上→下' },
                      ].map((option) => (
                      <Button
                        key={option.value}
                        variant={settings.lyricProgressDirection === option.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSettingChange('lyricProgressDirection', option.value as 'rtl' | 'ltr' | 'btt' | 'ttb')}
                        className="flex-1"
                        disabled={!settings.useKaraokeLyric || settings.useAMLL}
                      >
                        {option.label}
                      </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="useTTML" className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      TTML形式を使用
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">TTML形式の歌詞データが利用可能な場合に使用します</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Switch
                      id="useTTML"
                      checked={settings.useTTML}
                      onCheckedChange={(checked) => handleSettingChange('useTTML', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="useWordTiming" className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      単語単位の同期を使用
                      {!settings.useTTML && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">TTML形式がオフの場合は使用できません</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      </Label>
                    <Switch
                      id="useWordTiming"
                      checked={settings.useWordTiming}
                      onCheckedChange={(checked) => handleSettingChange('useWordTiming', checked)}
                      disabled={!settings.useTTML}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="useAMLL" className="text-sm font-medium flex items-center gap-2">
                      <Music className="h-4 w-4" />
                      AMLLを使用
                      {!settings.useTTML && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">TTML形式がオフの場合は使用できません</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </Label>
                    <Switch
                      id="useAMLL"
                      checked={settings.useAMLL}
                      onCheckedChange={(checked) => handleSettingChange('useAMLL', checked)}
                      disabled={!settings.useTTML}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="amllHidePassedLines" className="text-sm font-medium flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      過去の歌詞行を非表示
                      {!settings.useAMLL && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">AMLLがオフの場合は使用できません</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </Label>
                    <Switch
                      id="amllHidePassedLines"
                      checked={settings.amllHidePassedLines ?? false}
                      onCheckedChange={(checked) => handleSettingChange('amllHidePassedLines', checked)}
                      disabled={!settings.useAMLL}
                    />
                  </div>

                  <div className="flex justify-end mt-2">
                    <a
                      href="https://github.com/Steve-xmh/applemusic-like-lyrics"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:underline hover:text-primary flex items-center gap-2"
                    >
                      <SiGithub className="h-4 w-4" />
                      AMLL
                    </a>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="scrollPositionOffset" className="text-sm font-medium flex items-center gap-2">
                      <MoveHorizontal className="h-4 w-4 rotate-90" />
                      歌詞表示位置（上下）
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">画面上での歌詞の垂直位置を調整します</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <div className="pt-4 px-2">
                      <Slider
                        id="scrollPositionOffset"
                        defaultValue={[settings.scrollPositionOffset]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={(values) => handleSettingChange('scrollPositionOffset', values[0])}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-sm text-muted-foreground">上部</span>
                      <span className="text-sm text-muted-foreground">中央</span>
                      <span className="text-sm text-muted-foreground">下部</span>
                    </div>
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
                    <div className="pt-4 px-2">
                      <Slider
                        id="backgroundblur"
                        defaultValue={[settings.backgroundblur]}
                        min={0}
                        max={20}
                        step={1}
                        onValueChange={(values) => handleSettingChange('backgroundblur', values[0])}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-muted-foreground">なし</span>
                      <span className="text-xs text-muted-foreground">強</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="backgroundtransparency" className="text-sm font-medium flex items-center gap-2">
                      <Blend className="h-4 w-4" />
                      背景透明度
                    </Label>
                    <div className="pt-4 px-2">
                      <Slider
                        id="backgroundtransparency"
                        defaultValue={[settings.backgroundtransparency]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={(values) => handleSettingChange('backgroundtransparency', values[0])}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-muted-foreground">不透明</span>
                      <span className="text-xs text-muted-foreground">透明</span>
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

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="amllEnableSpring" className="text-sm font-medium flex items-center gap-2">
                      <Spline className="h-4 w-4" />
                      スプリングアニメーション
                      {!settings.useAMLL && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">AMLLがオフの場合は使用できません</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </Label>
                    <Switch
                      id="amllEnableSpring"
                      checked={settings.amllEnableSpring ?? true}
                      onCheckedChange={(checked) => handleSettingChange('amllEnableSpring', checked)}
                      disabled={!settings.useAMLL}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="amllEnableBlur" className="text-sm font-medium flex items-center gap-2">
                      <Blend className="h-4 w-4" />
                      ブラーエフェクト
                      {!settings.useAMLL && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">AMLLがオフの場合は使用できません</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </Label>
                    <Switch
                      id="amllEnableBlur"
                      checked={settings.amllEnableBlur ?? true}
                      onCheckedChange={(checked) => handleSettingChange('amllEnableBlur', checked)}
                      disabled={!settings.useAMLL}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="amllEnableScale" className="text-sm font-medium flex items-center gap-2">
                      <ArrowUpWideNarrow className="h-4 w-4" />
                      スケールエフェクト
                      {!settings.useAMLL && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">AMLLがオフの場合は使用できません</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </Label>
                    <Switch
                      id="amllEnableScale"
                      checked={settings.amllEnableScale ?? true}
                      onCheckedChange={(checked) => handleSettingChange('amllEnableScale', checked)}
                      disabled={!settings.useAMLL}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="theme" className="text-sm font-medium flex items-center gap-2">
                      <Spline className="h-4 w-4" />
                      カスタムイージング
                    </Label>
                    <Input
                      id="scrollEasing"
                      type="text"
                      value={settings.CustomEasing}
                      onChange={(e) => handleSettingChange('CustomEasing', e.target.value)}
                      placeholder="例: cubic-bezier(0.22, 1, 0.36, 1)"
                      className="mt-1"
                    />
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
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">フルプレーヤーモードでは位置の変更ができません</p>
                          </TooltipContent>
                        </Tooltip>
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
    </TooltipProvider>
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
            <TabsList className="grid w-full grid-cols-2 mb-4 sticky top-0 z-10 bg-background rounded-none">
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
              <Alert variant="default" className="bg-green-100 border-green-500 dark:bg-green-950/50 dark:border-green-600/50 mb-4">
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <AlertTitle className="text-green-700 dark:text-green-300 font-medium">AMLLの使用を推奨</AlertTitle>
                </div>
                <AlertDescription className="text-green-700 dark:text-green-300 mt-1 pl-7">
                  標準機能よりも遥かに優れた同期表示が可能です！
                </AlertDescription>
              </Alert>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">レイアウトと表示</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-6">
                    <div className="space-y-2">
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
                            disabled={settings.useAMLL}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                      {settings.useAMLL && (
                        <div className="text-sm text-muted-foreground bg-secondary p-2 rounded">
                          AMLLがオンの場合は使用できません（自動調整されます）
                        </div>
                      )}
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

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="useKaraokeLyric" className="text-sm font-medium flex items-center gap-2">
                      <MicVocal className="h-4 w-4" />
                      カラオケ風歌詞
                    </Label>
                    <Switch
                      id="useKaraokeLyric"
                      checked={settings.useKaraokeLyric}
                      onCheckedChange={(checked) => handleSettingChange('useKaraokeLyric', checked)}
                      disabled={settings.useAMLL}
                    />
                  </div>
                  {!settings.useAMLL && (
                    <div className="text-sm text-muted-foreground bg-secondary p-2 rounded">
                      AMLLがオンの場合は使用できません
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <ArrowUpWideNarrow className="h-4 w-4" />
                      カラオケ風歌詞進行方向
                    </Label>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { value: 'rtl', label: '右→左' },
                        { value: 'ltr', label: '左→右' },
                        { value: 'btt', label: '下→上' },
                        { value: 'ttb', label: '上→下' },
                      ].map((option) => (
                        <Button
                          key={option.value}
                          variant={settings.lyricProgressDirection === option.value ? "default" : "outline"}
                          onClick={() => handleSettingChange('lyricProgressDirection', option.value as 'rtl' | 'ltr' | 'btt' | 'ttb')}
                          className="w-full py-3"
                          disabled={!settings.useKaraokeLyric || settings.useAMLL}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                    {(!settings.useKaraokeLyric || settings.useAMLL) && (
                      <div className="text-sm text-muted-foreground bg-secondary p-2 rounded">
                      {!settings.useKaraokeLyric && "カラオケ風歌詞がオフの場合は使用できません"}
                      {settings.useAMLL && "AMLLがオンの場合は使用できません"}
                      </div>
                    )}
                  </div>

                    <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="useTTML" className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      TTML形式を使用
                    </Label>
                    <Switch
                      id="useTTML"
                      checked={settings.useTTML}
                      onCheckedChange={(checked) => handleSettingChange('useTTML', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="useWordTiming" className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      単語単位の同期を使用
                    </Label>
                    <Switch
                      id="useWordTiming"
                      checked={settings.useWordTiming}
                      onCheckedChange={(checked) => handleSettingChange('useWordTiming', checked)}
                      disabled={!settings.useTTML}
                    />
                  </div>
                  {!settings.useTTML && (
                    <div className="text-sm text-muted-foreground bg-secondary p-2 rounded">
                      TTML形式がオフの場合は使用できません
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="useAMLL" className="text-sm font-medium flex items-center gap-2">
                      <Music className="h-4 w-4" />
                      AMLLを使用
                    </Label>
                    <Switch
                      id="useAMLL"
                      checked={settings.useAMLL}
                      onCheckedChange={(checked) => handleSettingChange('useAMLL', checked)}
                      disabled={!settings.useTTML}
                    />
                  </div>
                  {!settings.useTTML && (
                    <div className="text-sm text-muted-foreground bg-secondary p-2 rounded">
                      TTML形式がオフの場合は使用できません
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Label htmlFor="amllHidePassedLines" className="text-sm font-medium flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      過去の歌詞行を非表示
                    </Label>
                    <Switch
                      id="amllHidePassedLines"
                      checked={settings.amllHidePassedLines ?? false}
                      onCheckedChange={(checked) => handleSettingChange('amllHidePassedLines', checked)}
                      disabled={!settings.useAMLL}
                    />
                  </div>
                  {!settings.useAMLL && (
                    <div className="text-sm text-muted-foreground bg-secondary p-2 rounded">
                      AMLLがオフの場合は使用できません
                    </div>
                  )}

                  <div className="flex justify-end mt-2">
                    <a
                      href="https://github.com/Steve-xmh/applemusic-like-lyrics"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:underline hover:text-primary flex items-center gap-2"
                    >
                      <SiGithub className="h-4 w-4" />
                      AMLL
                    </a>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                      <Label htmlFor="scrollPositionOffset" className="text-sm font-medium flex items-center gap-2 mb-2">
                        <MoveHorizontal className="h-4 w-4 rotate-90" />
                        歌詞表示位置（上下）
                      </Label>
                      <div className="text-sm text-muted-foreground bg-secondary p-2 rounded mb-2">
                        画面上での歌詞の垂直位置を調整します
                      </div>
                      <div className="pt-4 px-2">
                        <Slider
                          id="scrollPositionOffset"
                          defaultValue={[settings.scrollPositionOffset]}
                          min={0}
                          max={100}
                          step={5}
                          onValueChange={(values) => handleSettingChange('scrollPositionOffset', values[0])}
                        />
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-sm text-muted-foreground">上部</span>
                        <span className="text-sm text-muted-foreground">中央</span>
                        <span className="text-sm text-muted-foreground">下部</span>
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
                    <div className="pt-4 px-2">
                      <Slider
                        id="backgroundblur"
                        defaultValue={[settings.backgroundblur]}
                        min={0}
                        max={20}
                        step={1}
                        onValueChange={(values) => handleSettingChange('backgroundblur', values[0])}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-muted-foreground">なし</span>
                      <span className="text-xs text-muted-foreground">強</span>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label htmlFor="backgroundtransparency" className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Blend className="h-4 w-4" />
                      背景透明度
                    </Label>
                    <div className="pt-4 px-2">
                      <Slider
                        id="backgroundtransparency"
                        defaultValue={[settings.backgroundtransparency]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={(values) => handleSettingChange('backgroundtransparency', values[0])}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-muted-foreground">不透明</span>
                      <span className="text-xs text-muted-foreground">透明</span>
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

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="amllEnableSpring" className="text-sm font-medium flex items-center gap-2">
                      <Spline className="h-4 w-4" />
                      スプリングアニメーション
                    </Label>
                    <Switch
                      id="amllEnableSpring"
                      checked={settings.amllEnableSpring ?? true}
                      onCheckedChange={(checked) => handleSettingChange('amllEnableSpring', checked)}
                      disabled={!settings.useAMLL}
                    />
                  </div>
                  {!settings.useAMLL && (
                    <div className="text-sm text-muted-foreground bg-secondary p-2 rounded">
                      AMLLがオフの場合は使用できません
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Label htmlFor="amllEnableBlur" className="text-sm font-medium flex items-center gap-2">
                      <Blend className="h-4 w-4" />
                      ブラーエフェクト
                    </Label>
                    <Switch
                      id="amllEnableBlur"
                      checked={settings.amllEnableBlur ?? true}
                      onCheckedChange={(checked) => handleSettingChange('amllEnableBlur', checked)}
                      disabled={!settings.useAMLL}
                    />
                  </div>
                  {!settings.useAMLL && (
                    <div className="text-sm text-muted-foreground bg-secondary p-2 rounded">
                      AMLLがオフの場合は使用できません
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Label htmlFor="amllEnableScale" className="text-sm font-medium flex items-center gap-2">
                      <ArrowUpWideNarrow className="h-4 w-4" />
                      スケールエフェクト
                    </Label>
                    <Switch
                      id="amllEnableScale"
                      checked={settings.amllEnableScale ?? true}
                      onCheckedChange={(checked) => handleSettingChange('amllEnableScale', checked)}
                      disabled={!settings.useAMLL}
                    />
                  </div>
                  {!settings.useAMLL && (
                    <div className="text-sm text-muted-foreground bg-secondary p-2 rounded">
                      AMLLがオフの場合は使用できません
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="theme" className="text-sm font-medium flex items-center gap-2">
                      <Spline className="h-4 w-4" />
                      カスタムイージング
                    </Label>
                    <Input
                      id="scrollEasing"
                      type="text"
                      value={settings.CustomEasing}
                      onChange={(e) => handleSettingChange('CustomEasing', e.target.value)}
                      placeholder="例: cubic-bezier(0.22, 1, 0.36, 1)"
                      className="mt-1"
                    />
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
