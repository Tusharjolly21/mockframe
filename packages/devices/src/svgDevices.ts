import type { Device } from "./types";

/**
 * Hand-authored SVG frame devices (vector, not parametric-generated and not
 * raster photo scenes). The screenshot is clipped to the device's exact
 * display path (frame.maskPath); the metallic case + black band render around
 * it, built as symmetric rounded rects so the rim is even on every side.
 */
export const SVG_DEVICES: Device[] = [
  {
    "id": "watch-front",
    "name": "Apple Watch (Front)",
    "brand": "apple",
    "category": "watch",
    "released": "2024-09",
    "screen": {
      "width": 410,
      "height": 490,
      "cornerRadius": 70
    },
    "frame": {
      "width": 1000,
      "height": 1000,
      "screenRect": {
        "x": 351,
        "y": 322,
        "width": 299,
        "height": 357
      },
      "maskPath": "M649.404,373.052v253.904 c0,13.721-5.349,26.623-15.058,36.332c-9.701,9.701-22.611,15.051-36.332,15.051H401.99 c-13.721,0-26.623-5.349-36.332-15.051c-9.701-9.701-15.051-22.611-15.051-36.332V373.052c0-13.721,5.349-26.623,15.051-36.332 c9.701-9.701,22.611-15.058,36.332-15.058H598.01c13.721,0,26.623,5.357,36.332,15.058 C644.055,346.429,649.404,359.331,649.404,373.052z",
      "overlaySelector": "#overlay"
    },
    "variants": [
      {
        "id": "silver",
        "label": "Silver",
        "body": "<defs><linearGradient id=\"wf_case\" x1=\"0\" y1=\"281\" x2=\"0\" y2=\"719\" gradientUnits=\"userSpaceOnUse\"> <stop offset=\"0\" stop-color=\"#f4f4f6\"/><stop offset=\"0.5\" stop-color=\"#d0d0d4\"/><stop offset=\"1\" stop-color=\"#a6a6ab\"/></linearGradient><linearGradient id=\"wf_edge\" x1=\"311\" y1=\"0\" x2=\"689\" y2=\"0\" gradientUnits=\"userSpaceOnUse\"> <stop offset=\"0\" stop-color=\"#8f8f94\"/><stop offset=\"0.5\" stop-color=\"#f6f6f8\"/><stop offset=\"1\" stop-color=\"#8f8f94\"/></linearGradient><linearGradient id=\"wf_blk\" x1=\"0\" y1=\"302\" x2=\"0\" y2=\"698\" gradientUnits=\"userSpaceOnUse\"> <stop offset=\"0\" stop-color=\"#141416\"/><stop offset=\"1\" stop-color=\"#050506\"/></linearGradient><linearGradient id=\"wf_scr\" x1=\"351\" y1=\"322\" x2=\"649\" y2=\"679\" gradientUnits=\"userSpaceOnUse\"> <stop offset=\"0\" stop-color=\"#26262b\"/><stop offset=\"1\" stop-color=\"#0d0d10\"/></linearGradient><linearGradient id=\"wf_strap\" x1=\"366\" y1=\"0\" x2=\"634\" y2=\"0\" gradientUnits=\"userSpaceOnUse\"> <stop offset=\"0\" stop-color=\"#0b0b0c\"/><stop offset=\"0.5\" stop-color=\"#28282b\"/><stop offset=\"1\" stop-color=\"#0b0b0c\"/></linearGradient><linearGradient id=\"wf_crown\" x1=\"689\" y1=\"0\" x2=\"704\" y2=\"0\" gradientUnits=\"userSpaceOnUse\"> <stop offset=\"0\" stop-color=\"#c8c8cc\"/><stop offset=\"0.5\" stop-color=\"#f0f0f2\"/><stop offset=\"1\" stop-color=\"#9a9a9e\"/></linearGradient></defs><path d=\"M412,150 H588 A46,46 0 0 1 634,196 V304 A46,46 0 0 1 588,350 H412 A46,46 0 0 1 366,304 V196 A46,46 0 0 1 412,150 Z\" fill=\"url(#wf_strap)\"/><path d=\"M412,650 H588 A46,46 0 0 1 634,696 V804 A46,46 0 0 1 588,850 H412 A46,46 0 0 1 366,804 V696 A46,46 0 0 1 412,650 Z\" fill=\"url(#wf_strap)\"/><path d=\"M693,436 H697 A7,7 0 0 1 704,443 V493 A7,7 0 0 1 697,500 H693 A7,7 0 0 1 686,493 V443 A7,7 0 0 1 693,436 Z\" fill=\"url(#wf_crown)\"/><rect x=\"689\" y=\"452\" width=\"13\" height=\"32\" rx=\"2\" fill=\"#7c7c80\" opacity=\"0.55\"/><path d=\"M692,520 H697 A5,5 0 0 1 702,525 V589 A5,5 0 0 1 697,594 H692 A5,5 0 0 1 687,589 V525 A5,5 0 0 1 692,520 Z\" fill=\"url(#wf_crown)\"/><path d=\"M401,282 H599 A90,90 0 0 1 689,372 V628 A90,90 0 0 1 599,718 H401 A90,90 0 0 1 311,628 V372 A90,90 0 0 1 401,282 Z\" fill=\"url(#wf_case)\"/><path d=\"M401,284 H599 A88,88 0 0 1 687,372 V628 A88,88 0 0 1 599,716 H401 A88,88 0 0 1 313,628 V372 A88,88 0 0 1 401,284 Z\" fill=\"none\" stroke=\"url(#wf_edge)\" stroke-width=\"2\" opacity=\"0.7\"/><path d=\"M394,302 H606 A64,64 0 0 1 670,366 V634 A64,64 0 0 1 606,698 H394 A64,64 0 0 1 330,634 V366 A64,64 0 0 1 394,302 Z\" fill=\"url(#wf_blk)\"/><path d=\"M649.404,373.052v253.904 c0,13.721-5.349,26.623-15.058,36.332c-9.701,9.701-22.611,15.051-36.332,15.051H401.99 c-13.721,0-26.623-5.349-36.332-15.051c-9.701-9.701-15.051-22.611-15.051-36.332V373.052c0-13.721,5.349-26.623,15.051-36.332 c9.701-9.701,22.611-15.058,36.332-15.058H598.01c13.721,0,26.623,5.357,36.332,15.058 C644.055,346.429,649.404,359.331,649.404,373.052z\" fill=\"url(#wf_scr)\"/>",
        "overlay": "<path d=\"M649.404,373.052v253.904 c0,13.721-5.349,26.623-15.058,36.332c-9.701,9.701-22.611,15.051-36.332,15.051H401.99 c-13.721,0-26.623-5.349-36.332-15.051c-9.701-9.701-15.051-22.611-15.051-36.332V373.052c0-13.721,5.349-26.623,15.051-36.332 c9.701-9.701,22.611-15.058,36.332-15.058H598.01c13.721,0,26.623,5.357,36.332,15.058 C644.055,346.429,649.404,359.331,649.404,373.052z\" fill=\"none\" stroke=\"#000000\" stroke-width=\"6\" stroke-opacity=\"0.5\"/><path d=\"M649.404,373.052v253.904 c0,13.721-5.349,26.623-15.058,36.332c-9.701,9.701-22.611,15.051-36.332,15.051H401.99 c-13.721,0-26.623-5.349-36.332-15.051c-9.701-9.701-15.051-22.611-15.051-36.332V373.052c0-13.721,5.349-26.623,15.051-36.332 c9.701-9.701,22.611-15.058,36.332-15.058H598.01c13.721,0,26.623,5.357,36.332,15.058 C644.055,346.429,649.404,359.331,649.404,373.052z\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"1.4\" stroke-opacity=\"0.10\"/>",
        "preview": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\"><defs><linearGradient id=\"wf_case\" x1=\"0\" y1=\"281\" x2=\"0\" y2=\"719\" gradientUnits=\"userSpaceOnUse\"> <stop offset=\"0\" stop-color=\"#f4f4f6\"/><stop offset=\"0.5\" stop-color=\"#d0d0d4\"/><stop offset=\"1\" stop-color=\"#a6a6ab\"/></linearGradient><linearGradient id=\"wf_edge\" x1=\"311\" y1=\"0\" x2=\"689\" y2=\"0\" gradientUnits=\"userSpaceOnUse\"> <stop offset=\"0\" stop-color=\"#8f8f94\"/><stop offset=\"0.5\" stop-color=\"#f6f6f8\"/><stop offset=\"1\" stop-color=\"#8f8f94\"/></linearGradient><linearGradient id=\"wf_blk\" x1=\"0\" y1=\"302\" x2=\"0\" y2=\"698\" gradientUnits=\"userSpaceOnUse\"> <stop offset=\"0\" stop-color=\"#141416\"/><stop offset=\"1\" stop-color=\"#050506\"/></linearGradient><linearGradient id=\"wf_scr\" x1=\"351\" y1=\"322\" x2=\"649\" y2=\"679\" gradientUnits=\"userSpaceOnUse\"> <stop offset=\"0\" stop-color=\"#26262b\"/><stop offset=\"1\" stop-color=\"#0d0d10\"/></linearGradient><linearGradient id=\"wf_strap\" x1=\"366\" y1=\"0\" x2=\"634\" y2=\"0\" gradientUnits=\"userSpaceOnUse\"> <stop offset=\"0\" stop-color=\"#0b0b0c\"/><stop offset=\"0.5\" stop-color=\"#28282b\"/><stop offset=\"1\" stop-color=\"#0b0b0c\"/></linearGradient><linearGradient id=\"wf_crown\" x1=\"689\" y1=\"0\" x2=\"704\" y2=\"0\" gradientUnits=\"userSpaceOnUse\"> <stop offset=\"0\" stop-color=\"#c8c8cc\"/><stop offset=\"0.5\" stop-color=\"#f0f0f2\"/><stop offset=\"1\" stop-color=\"#9a9a9e\"/></linearGradient></defs><path d=\"M412,150 H588 A46,46 0 0 1 634,196 V304 A46,46 0 0 1 588,350 H412 A46,46 0 0 1 366,304 V196 A46,46 0 0 1 412,150 Z\" fill=\"url(#wf_strap)\"/><path d=\"M412,650 H588 A46,46 0 0 1 634,696 V804 A46,46 0 0 1 588,850 H412 A46,46 0 0 1 366,804 V696 A46,46 0 0 1 412,650 Z\" fill=\"url(#wf_strap)\"/><path d=\"M693,436 H697 A7,7 0 0 1 704,443 V493 A7,7 0 0 1 697,500 H693 A7,7 0 0 1 686,493 V443 A7,7 0 0 1 693,436 Z\" fill=\"url(#wf_crown)\"/><rect x=\"689\" y=\"452\" width=\"13\" height=\"32\" rx=\"2\" fill=\"#7c7c80\" opacity=\"0.55\"/><path d=\"M692,520 H697 A5,5 0 0 1 702,525 V589 A5,5 0 0 1 697,594 H692 A5,5 0 0 1 687,589 V525 A5,5 0 0 1 692,520 Z\" fill=\"url(#wf_crown)\"/><path d=\"M401,282 H599 A90,90 0 0 1 689,372 V628 A90,90 0 0 1 599,718 H401 A90,90 0 0 1 311,628 V372 A90,90 0 0 1 401,282 Z\" fill=\"url(#wf_case)\"/><path d=\"M401,284 H599 A88,88 0 0 1 687,372 V628 A88,88 0 0 1 599,716 H401 A88,88 0 0 1 313,628 V372 A88,88 0 0 1 401,284 Z\" fill=\"none\" stroke=\"url(#wf_edge)\" stroke-width=\"2\" opacity=\"0.7\"/><path d=\"M394,302 H606 A64,64 0 0 1 670,366 V634 A64,64 0 0 1 606,698 H394 A64,64 0 0 1 330,634 V366 A64,64 0 0 1 394,302 Z\" fill=\"url(#wf_blk)\"/><path d=\"M649.404,373.052v253.904 c0,13.721-5.349,26.623-15.058,36.332c-9.701,9.701-22.611,15.051-36.332,15.051H401.99 c-13.721,0-26.623-5.349-36.332-15.051c-9.701-9.701-15.051-22.611-15.051-36.332V373.052c0-13.721,5.349-26.623,15.051-36.332 c9.701-9.701,22.611-15.058,36.332-15.058H598.01c13.721,0,26.623,5.357,36.332,15.058 C644.055,346.429,649.404,359.331,649.404,373.052z\" fill=\"url(#wf_scr)\"/></svg>"
      }
    ],
    "aliases": [
      "apple watch mockup",
      "watch mockup",
      "apple watch front mockup"
    ],
    "seo": {
      "monthlyQueries": [
        "apple watch mockup",
        "watch mockup"
      ]
    }
  }
];
