/**
 * 毎フレーム参照する環境値。React の再描画を避けるため可変オブジェクトで共有する。
 * targetNight を書き換えると、night がなめらかに追従する（World で damp）。
 */
export const env = {
  night: 0,
  targetNight: 0,
};
