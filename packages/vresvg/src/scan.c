/* VentiMath, MIT. Nonzero scan conversion matching raster.cjs's reference.
 * No libc, allocator, WASI calls or third-party renderer code. IEEE double
 * operations and Float32 coverage stores are intentional compatibility rules. */
typedef unsigned char byte;
typedef struct { double x, low, high, slope, winding, order; } Edge;
typedef struct { double x, winding, order; } Hit;
#define MAX_WORK 300000000.0
#define floor __builtin_floor
#define ceil __builtin_ceil
static double min(double a,double b){return a<b?a:b;}
static double max(double a,double b){return a>b?a:b;}

/* Index tie breaks preserve JavaScript's stable sort, including coincident
 * boundaries whose span splits affect Float32 accumulation. Introsort bounds
 * adversarial work while exploiting the mostly ordered scanline input. */
static int edge_less(Edge a,Edge b){return a.low<b.low||(a.low==b.low&&a.order<b.order);}
static int hit_less(Hit a,Hit b){return a.x<b.x||(a.x==b.x&&a.order<b.order);}
static int value_less(double a,double b){return a<b;}
#define SORT(NAME,TYPE,LESS) \
static void NAME##_heap(TYPE *v,int n){ \
 for(int start=n/2-1;start>=0;start--){int p=start;TYPE item=v[p];while(p*2+1<n){int c=p*2+1;if(c+1<n&&LESS(v[c],v[c+1]))c++;if(!LESS(item,v[c]))break;v[p]=v[c];p=c;}v[p]=item;} \
 for(int end=n-1;end>0;end--){TYPE item=v[end];v[end]=v[0];int p=0;while(p*2+1<end){int c=p*2+1;if(c+1<end&&LESS(v[c],v[c+1]))c++;if(!LESS(item,v[c]))break;v[p]=v[c];p=c;}v[p]=item;} \
} \
static void NAME##_part(TYPE *v,int n,int depth){ \
 while(n>24){if(!depth--){NAME##_heap(v,n);return;}TYPE a=v[0],b=v[n/2],c=v[n-1],pivot=LESS(a,b)?(LESS(b,c)?b:(LESS(a,c)?c:a)):(LESS(a,c)?a:(LESS(b,c)?c:b));int i=0,j=n-1; \
  while(i<=j){while(LESS(v[i],pivot))i++;while(LESS(pivot,v[j]))j--;if(i<=j){TYPE tmp=v[i];v[i++]=v[j];v[j--]=tmp;}} \
  if(j+1<n-i){NAME##_part(v,j+1,depth);v+=i;n-=i;}else{NAME##_part(v+i,n-i,depth);n=j+1;} \
 } \
 for(int i=1;i<n;i++){TYPE item=v[i];int j=i;while(j>0&&LESS(item,v[j-1])){v[j]=v[j-1];j--;}v[j]=item;} \
} \
static void NAME(TYPE *v,int n){int depth=0;for(int size=n;size>1;size>>=1)depth+=2;NAME##_part(v,n,depth);}
SORT(sort_edges,Edge,edge_less)
SORT(sort_hits_general,Hit,hit_less)
static void sort_hits(Hit *v,int n){
 int moved=0;
 for(int i=1;i<n;i++){
  Hit item=v[i];int j=i;
  while(j>0&&hit_less(item,v[j-1])){v[j]=v[j-1];j--;moved++;}
  v[j]=item;
  if(moved>n*4){sort_hits_general(v,n);return;}
 }
}
SORT(sort_cuts,double,value_less)

// Reference Float32Array writes outside the clipped span are ignored. Preserve
// that rule even when extreme-coordinate interpolation rounds past an endpoint.
static void cover(float *values,int count,int index,double amount){
 if((unsigned int)index<(unsigned int)count)values[index]=(float)(values[index]+amount);
}
static void blend(byte *p,int r,int g,int b,double c){
 if(c<=0)return;c=min(1,c);
 if(c==1){p[0]=r;p[1]=g;p[2]=b;p[3]=255;return;}
 if(p[3]==255){double kept=1-c;p[0]=(byte)floor(r*c+p[0]*kept+0.5);p[1]=(byte)floor(g*c+p[1]*kept+0.5);p[2]=(byte)floor(b*c+p[2]*kept+0.5);return;}
 double old=p[3]/255.0,alpha=c+old*(1-c);if(alpha==0)return;
 double kept=old*(1-c);
 p[0]=(byte)floor((r*c+p[0]*kept)/alpha+0.5);
 p[1]=(byte)floor((g*c+p[1]*kept)/alpha+0.5);
 p[2]=(byte)floor((b*c+p[2]*kept)/alpha+0.5);
 p[3]=(byte)floor(alpha*255+0.5);
}

/* The caller sizes all scratch regions before entering. Work is returned even
 * for off-canvas edges, and -1 means the unchanged cumulative limit was hit. */
__attribute__((export_name("paint")))
double paint(Edge *edges,int n,int width,int height,byte *pixels,
 double low,double high,double minx,double maxx,int rgba,double work,byte *scratch){
 int first=(int)min(height,max(0,floor(low))),last=(int)max(0,min(height,ceil(high)));
 if(first>=last)return work;
 work+=n;if(work>MAX_WORK)return -1;
 int offset=(int)min(width,max(0,floor(minx))),limit=(int)max(0,min(width,ceil(maxx)));
 if(offset>=limit)return work;
 int *active=(int*)scratch;
 int *sampleActive=active+n;
 double *cuts=(double*)(scratch+n*8);
 Hit *hits=(Hit*)(cuts+2*n+9);
 float *coverage=(float*)(hits+n);
 sort_edges(edges,n);
 int next=0,na=0,sampleNext=0,ns=0;
 int r=rgba&255,g=(rgba>>8)&255,b=(rgba>>16)&255,a=(rgba>>24)&255;
 for(int y=first;y<last;y++){
  for(int i=0;i<limit-offset;i++)coverage[i]=0;
  int minX=width,maxX=0,kept=0;
  for(int i=0;i<na;i++)if(edges[active[i]].high>y)active[kept++]=active[i];na=kept;
  while(next<n&&edges[next].low<y+1){if(edges[next].high>y)active[na++]=next;next++;}
  int nc=0;cuts[nc++]=y;cuts[nc++]=y+1;for(int i=1;i<8;i++)cuts[nc++]=y+i/8.0;
  for(int i=0;i<na;i++){Edge *e=&edges[active[i]];if(e->low>y&&e->low<y+1)cuts[nc++]=e->low;if(e->high>y&&e->high<y+1)cuts[nc++]=e->high;}
  sort_cuts(cuts,nc);
  work+=(double)(nc-1)*(na+1);if(work>MAX_WORK)return -1;
  for(int sample=1;sample<nc;sample++){
   double weight=cuts[sample]-cuts[sample-1];if(!weight)continue;
   double at=(cuts[sample]+cuts[sample-1])/2;int count=0;
   /* Cuts include every vertex. Keep the subrow edge set as well as the
    * row set, so short curve/join edges aren't inspected at every sample.
    * Resource accounting above deliberately still charges the reference work. */
   int retained=0;
   for(int i=0;i<ns;i++){
    Edge *e=&edges[sampleActive[i]];if(e->high<=at)continue;
    sampleActive[retained++]=sampleActive[i];
    hits[count++]=(Hit){e->x+(at-e->low)*e->slope,e->winding,(double)sampleActive[i]};
   }
   ns=retained;
   while(sampleNext<n&&edges[sampleNext].low<=at){
    Edge *e=&edges[sampleNext];
    if(e->high>at){sampleActive[ns++]=sampleNext;hits[count++]=(Hit){e->x+(at-e->low)*e->slope,e->winding,(double)sampleNext};}
    sampleNext++;
   }
   sort_hits(hits,count);
   for(int i=0;i<count;i++)sampleActive[i]=(int)hits[i].order;
   int winding=0;double from=0;
   for(int i=0;i<count;i++){
    double x=hits[i].x;int previous=winding;winding+=(int)hits[i].winding;
    if(!previous&&winding)from=x;
    else if(previous&&!winding){
     double left=max(0,from),right=min(width,x);if(right<=left)continue;
     int l=(int)floor(left),r=(int)ceil(right);work+=r-l;if(work>MAX_WORK)return -1;
     if(l<minX)minX=l;if(r>maxX)maxX=r;
     if(r-l==1)cover(coverage,limit-offset,l-offset,(right-left)*weight);
     else {
      cover(coverage,limit-offset,l-offset,(l+1-left)*weight);
      for(int px=(int)max(l+1,offset);px<(int)min(r-1,limit);px++)coverage[px-offset]=(float)(coverage[px-offset]+weight);
      cover(coverage,limit-offset,r-1-offset,(right-r+1)*weight);
     }
    }
   }
  }
  for(int x=(int)max(minX,offset);x<(int)min(maxX,limit);x++)if(coverage[x-offset]>0)blend(pixels+(y*width+x)*4,r,g,b,min(1,coverage[x-offset])*a/255.0);
 }
 return work;
}

/* Lossless PNG Sub/Up filters; SIMD vectorization cannot change byte results. */
__attribute__((export_name("filter")))
void filter(int width,int height,const byte *__restrict pixels,byte *__restrict out,int first,int rows){
 int stride=width*4;
 for(int y=first;y<first+rows;y++){
  const byte *row=pixels+y*stride;byte *dest=out+(y-first)*(stride+1);dest[0]=y?2:1;
  if(y){const byte *prev=row-stride;for(int i=0;i<stride;i++)dest[i+1]=(byte)(row[i]-prev[i]);}
  else{for(int i=0;i<4;i++)dest[i+1]=row[i];for(int i=4;i<stride;i++)dest[i+1]=(byte)(row[i]-row[i-4]);}
 }
}

/* Incremental RFC 1950 checksum; 5552-byte batches cannot overflow uint32. */
__attribute__((export_name("adler")))
unsigned int adler(const byte *bytes,int n,unsigned int prior){
 unsigned int a=prior&65535,b=prior>>16;
 while(n){int count=n<5552?n:5552;n-=count;while(count--){a+=*bytes++;b+=a;}a%=65521;b%=65521;}
 return (b<<16)|a;
}
