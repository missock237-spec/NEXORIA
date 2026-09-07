'use client'

// NEXORIA — Registre des modèles 3D des 10 Suprêmes

import type { ComponentType } from 'react'
import type { SupremeId } from '@/lib/game/supremes'
import type { ModelProps } from './parts'
import { AetherionModel, NoxarModel, ThalyssModel, IgnarokModel, VerdaniaModel } from './ModelsA'
import { ChronyxModel, MorpheusModel, OmegaXModel, VhalorModel, InconnuModel } from './ModelsB'

export const SUPREME_MODELS: Record<SupremeId, ComponentType<ModelProps>> = {
  aetherion: AetherionModel,
  noxar: NoxarModel,
  thalyss: ThalyssModel,
  ignarok: IgnarokModel,
  verdania: VerdaniaModel,
  chronyx: ChronyxModel,
  morpheus: MorpheusModel,
  omega_x: OmegaXModel,
  vhalor: VhalorModel,
  inconnu: InconnuModel,
}
