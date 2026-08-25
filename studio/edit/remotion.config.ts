import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// 1080p — рівно те, що знімає gdigrab. Будь-яка інша висота означала б
// перемасштабування скрінкасту, а на ньому дрібний текст інтерфейсу.
Config.setChromiumOpenGlRenderer('angle');
