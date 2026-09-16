import { Composition } from 'remotion';

import { FPS, s } from './theme';
import { Promo, TOTAL } from './Main';
import { SceneBrand, BRAND_SEC } from './scenes/SceneBrand';
import { SceneHero, SceneSvitlofor, HERO_SEC, SVITLOFOR_SEC } from './scenes/SceneHero';
import { SceneCourses, COURSES_SEC } from './scenes/SceneCourses';
import { SceneOutro, OUTRO_SEC } from './scenes/SceneOutro';
import {
  SceneCourseMap, SceneDashboard, SceneLessonPrompt, SceneLessonTask,
  SceneLibrary, SceneProgress, SceneQuiz, SceneSecurity,
  COURSE_MAP_SEC, DASHBOARD_SEC, LESSON_PROMPT_SEC, LESSON_TASK_SEC,
  LIBRARY_SEC, PROGRESS_SEC, SECURITY_SEC, QUIZ_SEC,
} from './scenes/pages';

/**
 * Композиції промо.
 *
 * Крім цілого ролика, КОЖНА сцена зареєстрована окремо — і це не зручність, а
 * спосіб працювати. Рендер однієї сцени триває секунди, повного ролика —
 * хвилини. Правити кадр, щоразу ганяючи півтори хвилини, означає перевіряти
 * вдесятеро рідше, ніж треба.
 *
 * Той самий прийом уже виправдав себе в оснастці уроків: там брендові смуги
 * трейлера зібрані окремою композицією й доведені до ладу ще до зйомки.
 */

const SCENES = [
  { id: 'SceneBrand', component: SceneBrand, sec: BRAND_SEC },
  { id: 'SceneHero', component: SceneHero, sec: HERO_SEC },
  { id: 'SceneSvitlofor', component: SceneSvitlofor, sec: SVITLOFOR_SEC },
  { id: 'SceneDashboard', component: SceneDashboard, sec: DASHBOARD_SEC },
  { id: 'SceneCourses', component: SceneCourses, sec: COURSES_SEC },
  { id: 'SceneCourseMap', component: SceneCourseMap, sec: COURSE_MAP_SEC },
  { id: 'SceneLessonTask', component: SceneLessonTask, sec: LESSON_TASK_SEC },
  { id: 'SceneLessonPrompt', component: SceneLessonPrompt, sec: LESSON_PROMPT_SEC },
  { id: 'SceneSecurity', component: SceneSecurity, sec: SECURITY_SEC },
  { id: 'SceneQuiz', component: SceneQuiz, sec: QUIZ_SEC },
  { id: 'SceneLibrary', component: SceneLibrary, sec: LIBRARY_SEC },
  { id: 'SceneProgress', component: SceneProgress, sec: PROGRESS_SEC },
  { id: 'SceneOutro', component: SceneOutro, sec: OUTRO_SEC },
] as const;

export const Root: React.FC = () => (
  <>
    <Composition id="Promo" component={Promo} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />

    {SCENES.map((scene) => (
      <Composition
        key={scene.id}
        id={scene.id}
        component={scene.component}
        durationInFrames={s(scene.sec)}
        fps={FPS}
        width={1920}
        height={1080}
      />
    ))}
  </>
);
