import { type FC } from 'react';

import appIcon from '@assets/metal_gamer_snowflake.png';
import { Code2 } from 'lucide-react';

import { AppButton } from '@/renderer/components/AppButton';

import { useAppInfo } from '@/renderer/hooks/useAppInfo';
import { useOpenExternal } from '@/renderer/hooks/useOpenExternal';

import { GITHUB_URL } from '@/renderer/lib/links';

export const AboutTab: FC = () => {
  const { version, author } = useAppInfo();
  const openExternal = useOpenExternal();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 pt-8">
      <div className="flex items-start gap-6">
        <img src={appIcon} alt="App Icon" className="size-20 rounded-xl drop-shadow-md" />
        <div className="flex flex-col items-start gap-1">
          <span className="text-2xl font-bold tracking-tight text-white">Steam Update Freezer</span>
          <span className="text-sm text-steam-muted">{version ? `v${version}` : ' '}</span>
          {author && (
            <span className="text-sm text-steam-text">
              Developed by {author} &copy; {new Date().getFullYear()}
            </span>
          )}
        </div>
      </div>

      <div className="flex w-full gap-4">
        <AppButton
          icon={Code2}
          onClick={() => void openExternal(GITHUB_URL)}
          className="flex-1 justify-center border border-white/10 bg-black/20 py-3 text-steam-text hover:border-white/20 hover:text-white"
        >
          GitHub
        </AppButton>
      </div>
    </div>
  );
};
