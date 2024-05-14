import { Box, Flex } from '@yamada-ui/react';

export default function Home() {
  return (
    <>
      <Flex w='full' p='md' height={'calc(100vh - 64px)'} align={'center'} justify={'center'}>
        <Box fontSize='8xl'>🚧</Box>
      </Flex>
    </>
  );
}
