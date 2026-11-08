import { useQuiz } from '../../state/quiz';
import type { CameraShot } from '../../three/CameraRig';
import { Meadow } from '../../three/Diorama';
import { SignModel } from '../garden/GardenScene';
import { Pedestal, SpecimenView, zukanShot } from '../zukan/ZukanScene';

export const quizShot = (): CameraShot => ({ ...zukanShot(), orbit: undefined });

/** むしクイズ：問題の 虫を 台座の 上で 見せる */
export function QuizScene() {
  const q = useQuiz((s) => s.questions[s.index]);
  return (
    <group>
      <Meadow radius={8} />
      <Pedestal />
      {q?.subject ? (
        <SpecimenView key={`${q.subject.species}-${q.subject.stage}`} species={q.subject.species} stage={q.subject.stage} />
      ) : (
        <group position={[0, 0.62, 0]} scale={1.1}>
          <SignModel />
        </group>
      )}
    </group>
  );
}
