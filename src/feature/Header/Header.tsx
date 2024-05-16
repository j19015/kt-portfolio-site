'use client';

import { Box, Flex, Spacer, useDisclosure } from '@yamada-ui/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBars,
  faHouseUser,
  faBuilding,
  faBook,
  faStar,
  faCompass,
  IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { Drawer, DrawerHeader, DrawerBody, DrawerFooter } from '@yamada-ui/react';

import styles from './styles.module.scss';
import '@/app/styles/fonts.scss';

interface NavButtonProps {
  icon?: IconDefinition;
  label?: string;
  as?: 'button' | 'h1' | 'div';
  display?: { base: string; md: string } | string;
  onClick?: () => void;
  _hover?: { bg: string };
  width?: string;
  p?: string;
  px?: string;
  [x: string]: any;
}

const NavButton: React.FC<NavButtonProps> = ({ icon, label, ...props }) => (
  <Box
    rounded='4'
    color='black'
    alignItems='center'
    {...props}
    cursor={'pointer'}
    _hover={{ bg: 'gray.100' }}
    fontFamily='Pacifico'
  >
    {icon && <FontAwesomeIcon icon={icon} className={styles['header-icon']} />}
    {label}
  </Box>
);

export const Header: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <Flex w='full' gap='md' p='md' alignItems='center'>
        <NavButton as='h1' fontSize='4xl' label='kt-portfolio-site' p='md' fontFamily='Pacifico' />

        <Spacer />

        <NavButton icon={faHouseUser} label='Home' display={{ base: 'flex', md: 'none' }} p='md' />
        <NavButton
          icon={faBuilding}
          label='Career'
          display={{ base: 'flex', md: 'none' }}
          as='button'
          p='md'
        />
        <NavButton
          icon={faStar}
          label='Experience'
          display={{ base: 'flex', md: 'none' }}
          as='button'
          p='md'
        />
        <NavButton
          icon={faBook}
          label='Blogs'
          display={{ base: 'flex', md: 'none' }}
          as='button'
          p='md'
        />
        <NavButton
          icon={faCompass}
          label='Others'
          display={{ base: 'flex', md: 'none' }}
          as='button'
          p='md'
        />
        <NavButton
          icon={faBars}
          onClick={onOpen}
          display={{ base: 'none', md: 'block' }}
          as='button'
          p='md'
        />
      </Flex>
      <Drawer isOpen={isOpen} onClose={onClose} size='xs' duration={0.5}>
        <DrawerHeader>
          <Box fontWeight='bold' fontSize='lg'>
            Menu
          </Box>
        </DrawerHeader>

        <DrawerBody>
          <NavButton icon={faHouseUser} label='Home' display='flex' as='button' px='md' />
          <NavButton icon={faBuilding} label='Career' display='flex' as='button' px='md' />
          <NavButton icon={faStar} label='Experience' display='flex' as='button' px='md' />
          <NavButton icon={faBook} label='Blogs' display='flex' as='button' px='md' />
          <NavButton icon={faCompass} label='Others' display='flex' as='button' px='md' />
        </DrawerBody>
      </Drawer>
    </>
  );
};
