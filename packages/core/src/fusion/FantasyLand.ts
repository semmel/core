import { Stream, Sink, Scheduler, Disposable, Time } from '@most/types'
import { compose } from '@most/prelude'
import Pipe from '../sink/Pipe'
import { asap } from '@most/scheduler'
import { propagateEndTask } from '../scheduler/PropagateTask'

export abstract class FL<A> implements Stream<A> {
  ['fantasy-land/map']<B>(fn: (a: A) => B): FL<B> {
    return Map.create<A, B>(fn, this)
  }
  ['fantasy-land/empty'](): FL<never> {
    return new Empty()
  }

  _T?: A
  abstract run (sink: Sink<A>, scheduler: Scheduler): Disposable
}

export class Map<A, B> extends FL<B> {
  readonly f: (a: A) => B;
  readonly source: Stream<A>;

  constructor(f: (a: A) => B, source: Stream<A>) {
    super()
    this.f = f
    this.source = source
  }

  run(sink: Sink<B>, scheduler: Scheduler): Disposable {
    return this.source.run(new MapSink(this.f, sink), scheduler)
  }

  /**
   * Create a mapped source, fusing adjacent map.map, filter.map,
   * and filter.map.map if possible
   * @param {function(*):*} f mapping function
   * @param {{run:function}} source source to map
   * @returns {Map|FilterMap} mapped source, possibly fused
   */
  static create <A, B>(f: (a: A) => B, source: Stream<A>): FL<B> {
    if (isCanonicalEmpty(source)) {
      return empty()
    }

    if (source instanceof Map) {
      return new Map(compose(f, source.f), source.source)
    }

    // TODO
    // if (source instanceof Filter) {
    //   return new FilterMap(source.p, f, source.source)
    // }

    return new Map(f, source)
  }
}

class MapSink<A, B> extends Pipe<A, B> implements Sink<A> {
  private readonly f: (a: A) => B;

  constructor(f: (a: A) => B, sink: Sink<B>) {
    super(sink)
    this.f = f
  }

  event(t: Time, x: A): void {
    const f = this.f
    this.sink.event(t, f(x))
  }
}

class Empty extends FL<never> {
  run(sink: Sink<never>, scheduler: Scheduler): Disposable {
    return asap(propagateEndTask(sink), scheduler)
  }
}

export const EMPTY = new Empty()

export const empty = (): FL<never> => EMPTY

export const isCanonicalEmpty = (stream: Stream<unknown>): boolean =>
  stream === EMPTY

export const containsCanonicalEmpty = <A>(streams: ReadonlyArray<Stream<A>>): boolean =>
  streams.some(isCanonicalEmpty)

//
// export class FantasyLandStream<A> extends FL<A> implements Stream<A> {
//   constructor(private readonly stream: Stream<A>) {
//     super()
//   }
//
//   run(sink: Sink<A>, scheduler: Scheduler): Disposable {
//     return this.stream.run(sink, scheduler)
//   }
//
//   // ['fantasy-land/map']<B>(fn: (value: A) => B): FantasyLandStream<B> {
//   //   return map<A, B>(fn, this.stream)
//   // }
// }

// export interface FLS<A> extends Stream<A>{
//
// }
