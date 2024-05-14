import { Meta, StoryObj } from '@storybook/react';
import '@/app/styles/fonts.scss';
import { Footer } from './Footer';
import { UIProvider, colorModeManager, ColorModeScript } from '@yamada-ui/react';

const meta = {
  component: Footer,
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <>
      <UIProvider>
        <Footer />
      </UIProvider>
    </>
  ),
};
