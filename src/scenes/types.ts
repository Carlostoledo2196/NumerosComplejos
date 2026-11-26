import type { ModuleId } from '../state/store';

export interface SceneDef {
  /** 'e1' … 'e10' */
  id: string;
  number: number;
  title: string;
  minutes: number;
  /** etiqueta corta: «Inicio», «Ejercitador dinámico», … */
  tag: string;
  mount(): HTMLElement;
}

export interface ModuleDef {
  id: ModuleId;
  number: number;
  title: string;
  minutes: number;
  raps: string[];
  intro: string;
  scenes: SceneDef[];
}
