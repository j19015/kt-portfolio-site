import { Meta, StoryObj } from '@storybook/react';

import { Header } from './Header';
import { UIProvider, colorModeManager, ColorModeScript } from '@yamada-ui/react';

const meta = {
  component: Header,
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <>
      <UIProvider>
        <Header />
      </UIProvider>
    </>
  ),
};
