export default /* glsl */`
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

void main() {

	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <skinbase_vertex>

	// @THREE-Modification
	// normal instanced
	#ifdef INSTANCED
		mat4 instanceMat = compose( instancePosition, instanceQuaternion, instanceScale );
	#endif

	#ifdef USE_ENVMAP

	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinnormal_vertex>

	// @THREE-Modification
	// normal instanced
	#ifdef INSTANCED

		mat3 im = mat3( instanceMat );
		objectNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
		objectNormal = im * objectNormal;

	#endif

	#include <defaultnormal_vertex>

	#endif

	#include <begin_vertex>

	// @THREE-Modification
	// position instanced
	#ifdef INSTANCED
		transformed.xyz = ( instanceMat * vec4( transformed, 1.0 ) ).xyz;
	#endif

	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>

	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>

}
`;
