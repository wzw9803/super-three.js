import { EventDispatcher } from './EventDispatcher.js';
import { Face3 } from './Face3.js';
import { Matrix3 } from '../math/Matrix3.js';
import { Sphere } from '../math/Sphere.js';
import { Box3 } from '../math/Box3.js';
import { Vector3 } from '../math/Vector3.js';
import { Matrix4 } from '../math/Matrix4.js';
import { Vector2 } from '../math/Vector2.js';
import { Color } from '../math/Color.js';
import { Object3D } from './Object3D.js';
import { MathUtils } from '../math/MathUtils.js';

let _geometryId = 0; // Geometry uses even numbers as Id
const _m1 = new Matrix4();
const _obj = new Object3D();
const _offset = new Vector3();

function Geometry() {

	Object.defineProperty( this, 'id', { value: _geometryId += 2 } );

	this.uuid = MathUtils.generateUUID();

	this.name = '';
	this.type = 'Geometry';

	this.vertices = [];
	this.colors = [];
	this.faces = [];
	this.faceVertexUvs = [[]];

	this.morphTargets = [];
	this.morphNormals = [];

	this.skinWeights = [];
	this.skinIndices = [];

	this.lineDistances = [];

	this.boundingBox = null;
	this.boundingSphere = null;

	// update flags

	this.elementsNeedUpdate = false;
	this.verticesNeedUpdate = false;
	this.uvsNeedUpdate = false;
	this.normalsNeedUpdate = false;
	this.colorsNeedUpdate = false;
	this.lineDistancesNeedUpdate = false;
	this.groupsNeedUpdate = false;

}

Geometry.prototype = Object.assign( Object.create( EventDispatcher.prototype ), {

	constructor: Geometry,

	isGeometry: true,

	applyMatrix4: function ( matrix ) {

		const normalMatrix = new Matrix3().getNormalMatrix( matrix );

		for ( let i = 0, il = this.vertices.length; i < il; i ++ ) {

			const vertex = this.vertices[ i ];
			vertex.applyMatrix4( matrix );

		}

		for ( let i = 0, il = this.faces.length; i < il; i ++ ) {

			const face = this.faces[ i ];
			face.normal.applyMatrix3( normalMatrix ).normalize();

			for ( let j = 0, jl = face.vertexNormals.length; j < jl; j ++ ) {

				face.vertexNormals[ j ].applyMatrix3( normalMatrix ).normalize();

			}

		}

		if ( this.boundingBox !== null ) {

			this.computeBoundingBox();

		}

		if ( this.boundingSphere !== null ) {

			this.computeBoundingSphere();

		}

		this.verticesNeedUpdate = true;
		this.normalsNeedUpdate = true;

		return this;

	},

	rotateX: function ( angle ) {

		// rotate geometry around world x-axis

		_m1.makeRotationX( angle );

		this.applyMatrix4( _m1 );

		return this;

	},

	rotateY: function ( angle ) {

		// rotate geometry around world y-axis

		_m1.makeRotationY( angle );

		this.applyMatrix4( _m1 );

		return this;

	},

	rotateZ: function ( angle ) {

		// rotate geometry around world z-axis

		_m1.makeRotationZ( angle );

		this.applyMatrix4( _m1 );

		return this;

	},

	translate: function ( x, y, z ) {

		// translate geometry

		_m1.makeTranslation( x, y, z );

		this.applyMatrix4( _m1 );

		return this;

	},

	scale: function ( x, y, z ) {

		// scale geometry

		_m1.makeScale( x, y, z );

		this.applyMatrix4( _m1 );

		return this;

	},

	lookAt: function ( vector ) {

		_obj.lookAt( vector );

		_obj.updateMatrix();

		this.applyMatrix4( _obj.matrix );

		return this;

	},

	fromBufferGeometry: function ( geometry ) {

		const scope = this;

		const index = geometry.index !== null ? geometry.index : undefined;
		const attributes = geometry.attributes;

		if ( attributes.position === undefined ) {

			console.error( 'THREE.Geometry.fromBufferGeometry(): Position attribute required for conversion.' );
			return this;

		}

		const position = attributes.position;
		const normal = attributes.normal;
		const color = attributes.color;
		const uv = attributes.uv;
		const uv2 = attributes.uv2;

		if ( uv2 !== undefined ) this.faceVertexUvs[ 1 ] = [];

		for ( let i = 0; i < position.count; i ++ ) {

			scope.vertices.push( new Vector3().fromBufferAttribute( position, i ) );

			if ( color !== undefined ) {

				scope.colors.push( new Color().fromBufferAttribute( color, i ) );

			}

		}

		function addFace( a, b, c, materialIndex ) {

			const vertexColors = ( color === undefined ) ? [] : [
				scope.colors[ a ].clone(),
				scope.colors[ b ].clone(),
				scope.colors[ c ].clone()
			];

			const vertexNormals = ( normal === undefined ) ? [] : [
				new Vector3().fromBufferAttribute( normal, a ),
				new Vector3().fromBufferAttribute( normal, b ),
				new Vector3().fromBufferAttribute( normal, c )
			];

			const face = new Face3( a, b, c, vertexNormals, vertexColors, materialIndex );

			scope.faces.push( face );

			if ( uv !== undefined ) {

				scope.faceVertexUvs[ 0 ].push( [
					new Vector2().fromBufferAttribute( uv, a ),
					new Vector2().fromBufferAttribute( uv, b ),
					new Vector2().fromBufferAttribute( uv, c )
				] );

			}

			if ( uv2 !== undefined ) {

				scope.faceVertexUvs[ 1 ].push( [
					new Vector2().fromBufferAttribute( uv2, a ),
					new Vector2().fromBufferAttribute( uv2, b ),
					new Vector2().fromBufferAttribute( uv2, c )
				] );

			}

		}

		const groups = geometry.groups;
		const drawRange = geometry.drawRange; // @THREE-Modification fix for drawRange

		if ( groups.length > 0 ) {

			for ( let i = 0; i < groups.length; i ++ ) {

				const group = groups[ i ];

				// @THREE-Modification fix for drawRange
				const start = Math.max( group.start, drawRange.start );
				const count = Math.min( group.count, drawRange.count );

				for ( let j = start, jl = start + count; j < jl; j += 3 ) {

					if ( index !== undefined ) {

						addFace( index.getX( j ), index.getX( j + 1 ), index.getX( j + 2 ), group.materialIndex );

					} else {

						addFace( j, j + 1, j + 2, group.materialIndex );

					}

				}

			}

		} else {

			if ( index !== undefined ) {

				// @THREE-Modification fix for drawRange
				const start = Math.max( 0, drawRange.start );
				const count = Math.min( index.count - start, drawRange.count );

				for ( let i = start; i < start + count; i += 3 ) {

					addFace( index.getX( i ), index.getX( i + 1 ), index.getX( i + 2 ) );

				}

			} else {

				for ( let i = 0; i < position.count; i += 3 ) {

					addFace( i, i + 1, i + 2 );

				}

			}

		}

		this.computeFaceNormals();

		if ( geometry.boundingBox !== null ) {

			this.boundingBox = geometry.boundingBox.clone();

		}

		if ( geometry.boundingSphere !== null ) {

			this.boundingSphere = geometry.boundingSphere.clone();

		}

		return this;

	},

	center: function () {

		this.computeBoundingBox();

		this.boundingBox.getCenter( _offset ).negate();

		this.translate( _offset.x, _offset.y, _offset.z );

		return this;

	},

	normalize: function () {

		this.computeBoundingSphere();

		const center = this.boundingSphere.center;
		const radius = this.boundingSphere.radius;

		const s = radius === 0 ? 1 : 1.0 / radius;

		const matrix = new Matrix4();
		matrix.set(
			s, 0, 0, - s * center.x,
			0, s, 0, - s * center.y,
			0, 0, s, - s * center.z,
			0, 0, 0, 1
		);

		this.applyMatrix4( matrix );

		return this;

	},

	computeFaceNormals: function () {

		const cb = new Vector3(), ab = new Vector3();

		for ( let f = 0, fl = this.faces.length; f < fl; f ++ ) {

			const face = this.faces[ f ];

			const vA = this.vertices[ face.a ];
			const vB = this.vertices[ face.b ];
			const vC = this.vertices[ face.c ];

			cb.subVectors( vC, vB );
			ab.subVectors( vA, vB );
			cb.cross( ab );

			cb.normalize();

			face.normal.copy( cb );

		}

	},

	computeVertexNormals: function ( areaWeighted ) {

		if ( areaWeighted === undefined ) areaWeighted = true;

		const vertices = new Array( this.vertices.length );

		for ( let v = 0, vl = this.vertices.length; v < vl; v ++ ) {

			vertices[ v ] = new Vector3();

		}

		if ( areaWeighted ) {

			// vertex normals weighted by triangle areas
			// http://www.iquilezles.org/www/articles/normals/normals.htm

			const cb = new Vector3(), ab = new Vector3();

			for ( let f = 0, fl = this.faces.length; f < fl; f ++ ) {

				const face = this.faces[ f ];

				const vA = this.vertices[ face.a ];
				const vB = this.vertices[ face.b ];
				const vC = this.vertices[ face.c ];

				cb.subVectors( vC, vB );
				ab.subVectors( vA, vB );
				cb.cross( ab );

				vertices[ face.a ].add( cb );
				vertices[ face.b ].add( cb );
				vertices[ face.c ].add( cb );

			}

		} else {

			this.computeFaceNormals();

			for ( let f = 0, fl = this.faces.length; f < fl; f ++ ) {

				const face = this.faces[ f ];

				vertices[ face.a ].add( face.normal );
				vertices[ face.b ].add( face.normal );
				vertices[ face.c ].add( face.normal );

			}

		}

		for ( let v = 0, vl = this.vertices.length; v < vl; v ++ ) {

			vertices[ v ].normalize();

		}

		for ( let f = 0, fl = this.faces.length; f < fl; f ++ ) {

			const face = this.faces[ f ];

			const vertexNormals = face.vertexNormals;

			if ( vertexNormals.length === 3 ) {

				vertexNormals[ 0 ].copy( vertices[ face.a ] );
				vertexNormals[ 1 ].copy( vertices[ face.b ] );
				vertexNormals[ 2 ].copy( vertices[ face.c ] );

			} else {

				vertexNormals[ 0 ] = vertices[ face.a ].clone();
				vertexNormals[ 1 ] = vertices[ face.b ].clone();
				vertexNormals[ 2 ] = vertices[ face.c ].clone();

			}

		}

		if ( this.faces.length > 0 ) {

			this.normalsNeedUpdate = true;

		}

	},

	computeFlatVertexNormals: function () {

		this.computeFaceNormals();

		for ( let f = 0, fl = this.faces.length; f < fl; f ++ ) {

			const face = this.faces[ f ];

			const vertexNormals = face.vertexNormals;

			if ( vertexNormals.length === 3 ) {

				vertexNormals[ 0 ].copy( face.normal );
				vertexNormals[ 1 ].copy( face.normal );
				vertexNormals[ 2 ].copy( face.normal );

			} else {

				vertexNormals[ 0 ] = face.normal.clone();
				vertexNormals[ 1 ] = face.normal.clone();
				vertexNormals[ 2 ] = face.normal.clone();

			}

		}

		if ( this.faces.length > 0 ) {

			this.normalsNeedUpdate = true;

		}

	},

	computeMorphNormals: function () {

		// save original normals
		// - create temp variables on first access
		//   otherwise just copy (for faster repeated calls)

		for ( let f = 0, fl = this.faces.length; f < fl; f ++ ) {

			const face = this.faces[ f ];

			if ( ! face.__originalFaceNormal ) {

				face.__originalFaceNormal = face.normal.clone();

			} else {

				face.__originalFaceNormal.copy( face.normal );

			}

			if ( ! face.__originalVertexNormals ) face.__originalVertexNormals = [];

			for ( let i = 0, il = face.vertexNormals.length; i < il; i ++ ) {

				if ( ! face.__originalVertexNormals[ i ] ) {

					face.__originalVertexNormals[ i ] = face.vertexNormals[ i ].clone();

				} else {

					face.__originalVertexNormals[ i ].copy( face.vertexNormals[ i ] );

				}

			}

		}

		// use temp geometry to compute face and vertex normals for each morph

		const tmpGeo = new Geometry();
		tmpGeo.faces = this.faces;

		for ( let i = 0, il = this.morphTargets.length; i < il; i ++ ) {

			// create on first access

			if ( ! this.morphNormals[ i ] ) {

				this.morphNormals[ i ] = {};
				this.morphNormals[ i ].faceNormals = [];
				this.morphNormals[ i ].vertexNormals = [];

				const dstNormalsFace = this.morphNormals[ i ].faceNormals;
				const dstNormalsVertex = this.morphNormals[ i ].vertexNormals;

				for ( let f = 0, fl = this.faces.length; f < fl; f ++ ) {

					const faceNormal = new Vector3();
					const vertexNormals = { a: new Vector3(), b: new Vector3(), c: new Vector3() };

					dstNormalsFace.push( faceNormal );
					dstNormalsVertex.push( vertexNormals );

				}

			}

			const morphNormals = this.morphNormals[ i ];

			// set vertices to morph target

			tmpGeo.vertices = this.morphTargets[ i ].vertices;

			// compute morph normals

			tmpGeo.computeFaceNormals();
			tmpGeo.computeVertexNormals();

			// store morph normals

			for ( let f = 0, fl = this.faces.length; f < fl; f ++ ) {

				const face = this.faces[ f ];

				const faceNormal = morphNormals.faceNormals[ f ];
				const vertexNormals = morphNormals.vertexNormals[ f ];

				faceNormal.copy( face.normal );

				vertexNormals.a.copy( face.vertexNormals[ 0 ] );
				vertexNormals.b.copy( face.vertexNormals[ 1 ] );
				vertexNormals.c.copy( face.vertexNormals[ 2 ] );

			}

		}

		// restore original normals

		for ( let f = 0, fl = this.faces.length; f < fl; f ++ ) {

			const face = this.faces[ f ];

			face.normal = face.__originalFaceNormal;
			face.vertexNormals = face.__originalVertexNormals;

		}

	},

	computeBoundingBox: function () {

		if ( this.boundingBox === null ) {

			this.boundingBox = new Box3();

		}

		this.boundingBox.setFromPoints( this.vertices );

	},

	computeBoundingSphere: function () {

		if ( this.boundingSphere === null ) {

			this.boundingSphere = new Sphere();

		}

		this.boundingSphere.setFromPoints( this.vertices );

	},

	merge: function ( geometry, matrix, materialIndexOffset ) {

		if ( ! ( geometry && geometry.isGeometry ) ) {

			console.error( 'THREE.Geometry.merge(): geometry not an instance of THREE.Geometry.', geometry );
			return;

		}

		let normalMatrix;
		const vertexOffset = this.vertices.length,
			vertices1 = this.vertices,
			vertices2 = geometry.vertices,
			faces1 = this.faces,
			faces2 = geometry.faces,
			colors1 = this.colors,
			colors2 = geometry.colors;

		if ( materialIndexOffset === undefined ) materialIndexOffset = 0;

		if ( matrix !== undefined ) {

			normalMatrix = new Matrix3().getNormalMatrix( matrix );

		}

		// vertices

		for ( let i = 0, il = vertices2.length; i < il; i ++ ) {

			const vertex = vertices2[ i ];

			const vertexCopy = vertex.clone();

			if ( matrix !== undefined ) vertexCopy.applyMatrix4( matrix );

			vertices1.push( vertexCopy );

		}

		// colors

		for ( let i = 0, il = colors2.length; i < il; i ++ ) {

			colors1.push( colors2[ i ].clone() );

		}

		// faces

		for ( let i = 0, il = faces2.length; i < il; i ++ ) {

			const face = faces2[ i ];
			let normal, color;
			const faceVertexNormals = face.vertexNormals,
				faceVertexColors = face.vertexColors;

			const faceCopy = new Face3( face.a + vertexOffset, face.b + vertexOffset, face.c + vertexOffset );
			faceCopy.normal.copy( face.normal );

			if ( normalMatrix !== undefined ) {

				faceCopy.normal.applyMatrix3( normalMatrix ).normalize();

			}

			for ( let j = 0, jl = faceVertexNormals.length; j < jl; j ++ ) {

				normal = faceVertexNormals[ j ].clone();

				if ( normalMatrix !== undefined ) {

					normal.applyMatrix3( normalMatrix ).normalize();

				}

				faceCopy.vertexNormals.push( normal );

			}

			faceCopy.color.copy( face.color );

			for ( let j = 0, jl = faceVertexColors.length; j < jl; j ++ ) {

				color = faceVertexColors[ j ];
				faceCopy.vertexColors.push( color.clone() );

			}

			faceCopy.materialIndex = face.materialIndex + materialIndexOffset;

			faces1.push( faceCopy );

		}

		// uvs

		for ( let i = 0, il = geometry.faceVertexUvs.length; i < il; i ++ ) {

			const faceVertexUvs2 = geometry.faceVertexUvs[ i ];

			if ( this.faceVertexUvs[ i ] === undefined ) this.faceVertexUvs[ i ] = [];

			for ( let j = 0, jl = faceVertexUvs2.length; j < jl; j ++ ) {

				const uvs2 = faceVertexUvs2[ j ], uvsCopy = [];

				for ( let k = 0, kl = uvs2.length; k < kl; k ++ ) {

					uvsCopy.push( uvs2[ k ].clone() );

				}

				this.faceVertexUvs[ i ].push( uvsCopy );

			}

		}

	},

	mergeMesh: function ( mesh ) {

		if ( ! ( mesh && mesh.isMesh ) ) {

			console.error( 'THREE.Geometry.mergeMesh(): mesh not an instance of THREE.Mesh.', mesh );
			return;

		}

		if ( mesh.matrixAutoUpdate ) mesh.updateMatrix();

		this.merge( mesh.geometry, mesh.matrix );

	},

	/*
	 * Checks for duplicate vertices with hashmap.
	 * Duplicated vertices are removed
	 * and faces' vertices are updated.
	 */

	mergeVertices: function () {

		const verticesMap = {}; // Hashmap for looking up vertices by position coordinates (and making sure they are unique)
		const unique = [], changes = [];

		const precisionPoints = 4; // number of decimal points, e.g. 4 for epsilon of 0.0001
		const precision = Math.pow( 10, precisionPoints );

		for ( let i = 0, il = this.vertices.length; i < il; i ++ ) {

			const v = this.vertices[ i ];
			const key = Math.round( v.x * precision ) + '_' + Math.round( v.y * precision ) + '_' + Math.round( v.z * precision );

			if ( verticesMap[ key ] === undefined ) {

				verticesMap[ key ] = i;
				unique.push( this.vertices[ i ] );
				changes[ i ] = unique.length - 1;

			} else {

				//console.log('Duplicate vertex found. ', i, ' could be using ', verticesMap[key]);
				changes[ i ] = changes[ verticesMap[ key ] ];

			}

		}


		// if faces are completely degenerate after merging vertices, we
		// have to remove them from the geometry.
		const faceIndicesToRemove = [];

		for ( let i = 0, il = this.faces.length; i < il; i ++ ) {

			const face = this.faces[ i ];

			face.a = changes[ face.a ];
			face.b = changes[ face.b ];
			face.c = changes[ face.c ];

			const indices = [ face.a, face.b, face.c ];

			// if any duplicate vertices are found in a Face3
			// we have to remove the face as nothing can be saved
			for ( let n = 0; n < 3; n ++ ) {

				if ( indices[ n ] === indices[ ( n + 1 ) % 3 ] ) {

					faceIndicesToRemove.push( i );
					break;

				}

			}

		}

		for ( let i = faceIndicesToRemove.length - 1; i >= 0; i -- ) {

			const idx = faceIndicesToRemove[ i ];

			this.faces.splice( idx, 1 );

			for ( let j = 0, jl = this.faceVertexUvs.length; j < jl; j ++ ) {

				this.faceVertexUvs[ j ].splice( idx, 1 );

			}

		}

		// Use unique set of vertices

		const diff = this.vertices.length - unique.length;
		this.vertices = unique;
		return diff;

	},

	setFromPoints: function ( points ) {

		this.vertices = [];

		for ( let i = 0, l = points.length; i < l; i ++ ) {

			const point = points[ i ];
			this.vertices.push( new Vector3( point.x, point.y, point.z || 0 ) );

		}

		return this;

	},

	sortFacesByMaterialIndex: function () {

		const faces = this.faces;
		const length = faces.length;

		// tag faces

		for ( let i = 0; i < length; i ++ ) {

			faces[ i ]._id = i;

		}

		// sort faces

		function materialIndexSort( a, b ) {

			return a.materialIndex - b.materialIndex;

		}

		faces.sort( materialIndexSort );

		// sort uvs

		const uvs1 = this.faceVertexUvs[ 0 ];
		const uvs2 = this.faceVertexUvs[ 1 ];

		let newUvs1, newUvs2;

		if ( uvs1 && uvs1.length === length ) newUvs1 = [];
		if ( uvs2 && uvs2.length === length ) newUvs2 = [];

		for ( let i = 0; i < length; i ++ ) {

			const id = faces[ i ]._id;

			if ( newUvs1 ) newUvs1.push( uvs1[ id ] );
			if ( newUvs2 ) newUvs2.push( uvs2[ id ] );

		}

		if ( newUvs1 ) this.faceVertexUvs[ 0 ] = newUvs1;
		if ( newUvs2 ) this.faceVertexUvs[ 1 ] = newUvs2;

	},

	toJSON: function () {

		const data = {
			metadata: {
				version: 4.5,
				type: 'Geometry',
				generator: 'Geometry.toJSON'
			}
		};

		// standard Geometry serialization

		data.uuid = this.uuid;
		data.type = this.type;
		if ( this.name !== '' ) data.name = this.name;

		if ( this.parameters !== undefined ) {

			const parameters = this.parameters;

			for ( const key in parameters ) {

				if ( parameters[ key ] !== undefined ) data[ key ] = parameters[ key ];

			}

			return data;

		}

		const vertices = [];

		for ( let i = 0; i < this.vertices.length; i ++ ) {

			const vertex = this.vertices[ i ];
			vertices.push( vertex.x, vertex.y, vertex.z );

		}

		const faces = [];
		const normals = [];
		const normalsHash = {};
		const colors = [];
		const colorsHash = {};
		const uvs = [];
		const uvsHash = {};

		for ( let i = 0; i < this.faces.length; i ++ ) {

			const face = this.faces[ i ];

			const hasMaterial = true;
			const hasFaceUv = false; // deprecated
			const hasFaceVertexUv = this.faceVertexUvs[ 0 ][ i ] !== undefined;
			const hasFaceNormal = face.normal.length() > 0;
			const hasFaceVertexNormal = face.vertexNormals.length > 0;
			const hasFaceColor = face.color.r !== 1 || face.color.g !== 1 || face.color.b !== 1;
			const hasFaceVertexColor = face.vertexColors.length > 0;

			let faceType = 0;

			faceType = setBit( faceType, 0, 0 ); // isQuad
			faceType = setBit( faceType, 1, hasMaterial );
			faceType = setBit( faceType, 2, hasFaceUv );
			faceType = setBit( faceType, 3, hasFaceVertexUv );
			faceType = setBit( faceType, 4, hasFaceNormal );
			faceType = setBit( faceType, 5, hasFaceVertexNormal );
			faceType = setBit( faceType, 6, hasFaceColor );
			faceType = setBit( faceType, 7, hasFaceVertexColor );

			faces.push( faceType );
			faces.push( face.a, face.b, face.c );
			faces.push( face.materialIndex );

			if ( hasFaceVertexUv ) {

				const faceVertexUvs = this.faceVertexUvs[ 0 ][ i ];

				faces.push(
					getUvIndex( faceVertexUvs[ 0 ] ),
					getUvIndex( faceVertexUvs[ 1 ] ),
					getUvIndex( faceVertexUvs[ 2 ] )
				);

			}

			if ( hasFaceNormal ) {

				faces.push( getNormalIndex( face.normal ) );

			}

			if ( hasFaceVertexNormal ) {

				const vertexNormals = face.vertexNormals;

				faces.push(
					getNormalIndex( vertexNormals[ 0 ] ),
					getNormalIndex( vertexNormals[ 1 ] ),
					getNormalIndex( vertexNormals[ 2 ] )
				);

			}

			if ( hasFaceColor ) {

				faces.push( getColorIndex( face.color ) );

			}

			if ( hasFaceVertexColor ) {

				const vertexColors = face.vertexColors;

				faces.push(
					getColorIndex( vertexColors[ 0 ] ),
					getColorIndex( vertexColors[ 1 ] ),
					getColorIndex( vertexColors[ 2 ] )
				);

			}

		}

		function setBit( value, position, enabled ) {

			return enabled ? value | ( 1 << position ) : value & ( ~ ( 1 << position ) );

		}

		function getNormalIndex( normal ) {

			const hash = normal.x.toString() + normal.y.toString() + normal.z.toString();

			if ( normalsHash[ hash ] !== undefined ) {

				return normalsHash[ hash ];

			}

			normalsHash[ hash ] = normals.length / 3;
			normals.push( normal.x, normal.y, normal.z );

			return normalsHash[ hash ];

		}

		function getColorIndex( color ) {

			const hash = color.r.toString() + color.g.toString() + color.b.toString();

			if ( colorsHash[ hash ] !== undefined ) {

				return colorsHash[ hash ];

			}

			colorsHash[ hash ] = colors.length;
			colors.push( color.getHex() );

			return colorsHash[ hash ];

		}

		function getUvIndex( uv ) {

			const hash = uv.x.toString() + uv.y.toString();

			if ( uvsHash[ hash ] !== undefined ) {

				return uvsHash[ hash ];

			}

			uvsHash[ hash ] = uvs.length / 2;
			uvs.push( uv.x, uv.y );

			return uvsHash[ hash ];

		}

		data.data = {};

		data.data.vertices = vertices;
		data.data.normals = normals;
		if ( colors.length > 0 ) data.data.colors = colors;
		if ( uvs.length > 0 ) data.data.uvs = [ uvs ]; // temporal backward compatibility
		data.data.faces = faces;

		return data;

	},

	clone: function () {

		/*
		 // Handle primitives

		 const parameters = this.parameters;

		 if ( parameters !== undefined ) {

		 const values = [];

		 for ( const key in parameters ) {

		 values.push( parameters[ key ] );

		 }

		 const geometry = Object.create( this.constructor.prototype );
		 this.constructor.apply( geometry, values );
		 return geometry;

		 }

		 return new this.constructor().copy( this );
		 */

		return new Geometry().copy( this );

	},

	copy: function ( source ) {

		// reset

		this.vertices = [];
		this.colors = [];
		this.faces = [];
		this.faceVertexUvs = [[]];
		this.morphTargets = [];
		this.morphNormals = [];
		this.skinWeights = [];
		this.skinIndices = [];
		this.lineDistances = [];
		this.boundingBox = null;
		this.boundingSphere = null;

		// name

		this.name = source.name;

		// vertices

		const vertices = source.vertices;

		for ( let i = 0, il = vertices.length; i < il; i ++ ) {

			this.vertices.push( vertices[ i ].clone() );

		}

		// colors

		const colors = source.colors;

		for ( let i = 0, il = colors.length; i < il; i ++ ) {

			this.colors.push( colors[ i ].clone() );

		}

		// faces

		const faces = source.faces;

		for ( let i = 0, il = faces.length; i < il; i ++ ) {

			this.faces.push( faces[ i ].clone() );

		}

		// face vertex uvs

		for ( let i = 0, il = source.faceVertexUvs.length; i < il; i ++ ) {

			const faceVertexUvs = source.faceVertexUvs[ i ];

			if ( this.faceVertexUvs[ i ] === undefined ) {

				this.faceVertexUvs[ i ] = [];

			}

			for ( let j = 0, jl = faceVertexUvs.length; j < jl; j ++ ) {

				const uvs = faceVertexUvs[ j ], uvsCopy = [];

				for ( let k = 0, kl = uvs.length; k < kl; k ++ ) {

					const uv = uvs[ k ];

					uvsCopy.push( uv.clone() );

				}

				this.faceVertexUvs[ i ].push( uvsCopy );

			}

		}

		// morph targets

		const morphTargets = source.morphTargets;

		for ( let i = 0, il = morphTargets.length; i < il; i ++ ) {

			const morphTarget = {};
			morphTarget.name = morphTargets[ i ].name;

			// vertices

			if ( morphTargets[ i ].vertices !== undefined ) {

				morphTarget.vertices = [];

				for ( let j = 0, jl = morphTargets[ i ].vertices.length; j < jl; j ++ ) {

					morphTarget.vertices.push( morphTargets[ i ].vertices[ j ].clone() );

				}

			}

			// normals

			if ( morphTargets[ i ].normals !== undefined ) {

				morphTarget.normals = [];

				for ( let j = 0, jl = morphTargets[ i ].normals.length; j < jl; j ++ ) {

					morphTarget.normals.push( morphTargets[ i ].normals[ j ].clone() );

				}

			}

			this.morphTargets.push( morphTarget );

		}

		// morph normals

		const morphNormals = source.morphNormals;

		for ( let i = 0, il = morphNormals.length; i < il; i ++ ) {

			const morphNormal = {};

			// vertex normals

			if ( morphNormals[ i ].vertexNormals !== undefined ) {

				morphNormal.vertexNormals = [];

				for ( let j = 0, jl = morphNormals[ i ].vertexNormals.length; j < jl; j ++ ) {

					const srcVertexNormal = morphNormals[ i ].vertexNormals[ j ];
					const destVertexNormal = {};

					destVertexNormal.a = srcVertexNormal.a.clone();
					destVertexNormal.b = srcVertexNormal.b.clone();
					destVertexNormal.c = srcVertexNormal.c.clone();

					morphNormal.vertexNormals.push( destVertexNormal );

				}

			}

			// face normals

			if ( morphNormals[ i ].faceNormals !== undefined ) {

				morphNormal.faceNormals = [];

				for ( let j = 0, jl = morphNormals[ i ].faceNormals.length; j < jl; j ++ ) {

					morphNormal.faceNormals.push( morphNormals[ i ].faceNormals[ j ].clone() );

				}

			}

			this.morphNormals.push( morphNormal );

		}

		// skin weights

		const skinWeights = source.skinWeights;

		for ( let i = 0, il = skinWeights.length; i < il; i ++ ) {

			this.skinWeights.push( skinWeights[ i ].clone() );

		}

		// skin indices

		const skinIndices = source.skinIndices;

		for ( let i = 0, il = skinIndices.length; i < il; i ++ ) {

			this.skinIndices.push( skinIndices[ i ].clone() );

		}

		// line distances

		const lineDistances = source.lineDistances;

		for ( let i = 0, il = lineDistances.length; i < il; i ++ ) {

			this.lineDistances.push( lineDistances[ i ] );

		}

		// bounding box

		const boundingBox = source.boundingBox;

		if ( boundingBox !== null ) {

			this.boundingBox = boundingBox.clone();

		}

		// bounding sphere

		const boundingSphere = source.boundingSphere;

		if ( boundingSphere !== null ) {

			this.boundingSphere = boundingSphere.clone();

		}

		// update flags

		this.elementsNeedUpdate = source.elementsNeedUpdate;
		this.verticesNeedUpdate = source.verticesNeedUpdate;
		this.uvsNeedUpdate = source.uvsNeedUpdate;
		this.normalsNeedUpdate = source.normalsNeedUpdate;
		this.colorsNeedUpdate = source.colorsNeedUpdate;
		this.lineDistancesNeedUpdate = source.lineDistancesNeedUpdate;
		this.groupsNeedUpdate = source.groupsNeedUpdate;

		return this;

	},

	dispose: function () {

		this.dispatchEvent( { type: 'dispose' } );

	}

} );


export { Geometry };
