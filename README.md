# Patient round on a 3D anatomy atlas

[patient-round](patient-round/) is a fictional trauma round built on the Svitylo 3D Anatomy Atlas. One patient, the structures that need attention, and tools that operate in the 3D scene: surface marks, impact arrows, a probe, calipers, notes stuck to the model, and a cutaway plane.

The atlas itself is the public project [authorOd/3d-anatomy-atlas](https://github.com/authorOd/3d-anatomy-atlas). Clone it, then start the round:

```sh
git clone https://github.com/authorOd/3d-anatomy-atlas.git /tmp/3d-anatomy-atlas
cd /tmp/3d-anatomy-atlas
pnpm install

cd patient-round
npm install
npm run dev
```

The round is at http://127.0.0.1:43131/

The atlas’s own demo, from its checkout, is `pnpm demo:dev` (http://localhost:5173).
