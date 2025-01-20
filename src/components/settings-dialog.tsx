'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

interface Settings {
  showplayercontrol: boolean;
  fullplayer: boolean;
  fontSize: 'small' | 'medium' | 'large';
  lyricposition: 'left' | 'center' | 'right';
  backgroundblur: 'none' | 'small' | 'medium' | 'large';
  backgroundtransparency:  'none' | 'small' | 'medium' | 'large';
  theme: 'system' | 'dark' | 'light';
  playerposition: 'left' | 'center' | 'right';
  volume: number;
}

interface SettingsDialogProps {
  showSettings: boolean;
  setShowSettings: (value: boolean) => void;
  settings: Settings;
  handleSettingChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  isMobile: boolean;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  showSettings,
  setShowSettings,
  settings,
  handleSettingChange,
  isMobile,
}) => {
  return (
    <Dialog open={showSettings} onOpenChange={setShowSettings}>
      <DialogContent className="bg-white dark:bg-gray-800 border-0 overflow-scroll" style={{ maxHeight: '80vh' }}>
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-gray-900 dark:text-white">Show Player Controls</span>
            <Switch
              checked={settings.showplayercontrol}
              onCheckedChange={(checked) => handleSettingChange('showplayercontrol', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-900 dark:text-white">Full Player</span>
            <Switch
              checked={isMobile ? true : settings.fullplayer}
              onCheckedChange={(checked) => !isMobile && handleSettingChange('fullplayer', checked)}
              disabled={isMobile}
            />
          </div>

          <div className="space-y-2">
            <p className="text-gray-900 dark:text-white">Font Size</p>
            <div className="flex gap-2">
              {[
                { value: 'small', label: 'Small' },
                { value: 'medium', label: 'Medium' },
                { value: 'large', label: 'Large' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={settings.fontSize === option.value ? 'default' : 'secondary'}
                  onClick={() => handleSettingChange('fontSize', option.value as 'small' | 'medium' | 'large')}
                  className="flex-1"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-gray-900 dark:text-white">Lyric Position</p>
            <div className="flex gap-2">
              {[
                { value: 'left', label: 'Left' },
                { value: 'center', label: 'Center' },
                { value: 'right', label: 'Right' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={settings.lyricposition === option.value ? 'default' : 'secondary'}
                  onClick={() => handleSettingChange('lyricposition', option.value as 'left' | 'center' | 'right')}
                  className="flex-1"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-gray-900 dark:text-white">Background Blur</p>
            <div className="flex gap-2">
              {[
                { value: 'none', label: 'None' },
                { value: 'small', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'large', label: 'High' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={settings.backgroundblur === option.value ? 'default' : 'secondary'}
                  onClick={() => handleSettingChange('backgroundblur', option.value as 'none' | 'small' | 'medium' | 'large')}
                  className="flex-1"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-gray-900 dark:text-white">Background Transparency</p>
            <div className="flex gap-2">
              {[
                { value: 'none', label: 'None' },
                { value: 'small', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'large', label: 'High' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={settings.backgroundtransparency === option.value ? 'default' : 'secondary'}
                  onClick={() => handleSettingChange('backgroundtransparency', option.value as 'none' | 'small' | 'medium' | 'large')}
                  className="flex-1"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-gray-900 dark:text-white">Theme</p>
            <div className="flex gap-2">
              {[
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Light' },
                { value: 'system', label: 'System' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={settings.theme === option.value ? 'default' : 'secondary'}
                  onClick={() => handleSettingChange('theme', option.value as 'dark' | 'light' | 'system')}
                  className="flex-1"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-gray-900 dark:text-white">Player Position</p>
            <div className="flex gap-2">
              {[
                { value: 'left', label: 'Left' },
                { value: 'center', label: 'Center' },
                { value: 'right', label: 'Right' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={settings.playerposition === option.value ? 'default' : 'secondary'}
                  onClick={() => !settings.fullplayer && handleSettingChange('playerposition', option.value as 'left' | 'center' | 'right')}
                  className="flex-1"
                  disabled={settings.fullplayer}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;