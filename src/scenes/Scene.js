import { Object3D } from '../core/Object3D.js';

class Scene extends Object3D {

	constructor() {

		super();

		Object.defineProperty( this, 'isScene', { value: true } );

		this.type = 'Scene';

		this.background = null;
		this.environment = null;
		this.fog = null;

		this.envQuaternion = null; // @THREE-Modification for global env map rotation

		this.overrideMaterial = null;

		this.autoUpdate = true; // checked by the renderer

		if ( typeof __THREE_DEVTOOLS__ !== 'undefined' ) {

			__THREE_DEVTOOLS__.dispatchEvent( new CustomEvent( 'observe', { detail: this } ) ); // eslint-disable-line no-undef

		}

	}

	copy( source, recursive ) {

		super.copy( source, recursive );

		if ( source.background !== null ) this.background = source.background.clone();
		if ( source.environment !== null ) this.environment = source.environment.clone();
		if ( source.fog !== null ) this.fog = source.fog.clone();

		// @THREE-Modification for global env map rotation
		if ( source.envQuaternion ) {

			this.envQuaternion = source.envQuaternion.clone();

		} else {

			this.envQuaternion = null;

		}

		if ( source.overrideMaterial !== null ) this.overrideMaterial = source.overrideMaterial.clone();

		this.autoUpdate = source.autoUpdate;
		this.matrixAutoUpdate = source.matrixAutoUpdate;

		return this;

	}

	toJSON( meta ) {

		const data = super.toJSON( meta );

		if ( this.background !== null ) data.object.background = this.background.toJSON( meta );
		if ( this.environment !== null ) data.object.environment = this.environment.toJSON( meta );
		if ( this.fog !== null ) data.object.fog = this.fog.toJSON();

		return data;

	}

}


export { Scene };
