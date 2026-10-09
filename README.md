# Patient round on a 3D anatomy atlas

Two folders sit next to each other:

| Folder | What it is |
| --- | --- |
| [3d-anatomy-atlas](3d-anatomy-atlas/) | The Svitylo atlas, copied unchanged from [authorOd/3d-anatomy-atlas](https://github.com/authorOd/3d-anatomy-atlas) |
| [patient-round](patient-round/) | A fictional trauma round on that atlas: marked injuries, impact arrows, a surface probe, calipers, notes stuck to the model, and a cutaway plane |

From this project:

```sh
cd 3d-anatomy-atlas
pnpm install

cd ../patient-round
npm install
npm run dev
```

The round is at http://127.0.0.1:43131/

The atlas’s own demo, from `3d-anatomy-atlas`, is `pnpm demo:dev`.
