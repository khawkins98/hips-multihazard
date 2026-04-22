import { describe, it, expect, vi } from 'vitest';
import { createBus } from './bus.js';

describe('createBus()', () => {
  it('calls a registered handler with the emitted data', () => {
    const bus = createBus();
    const fn = vi.fn();
    bus.on('test', fn);
    bus.emit('test', { value: 42 });
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith({ value: 42 });
  });

  it('calls all handlers registered for the same event', () => {
    const bus = createBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('evt', a);
    bus.on('evt', b);
    bus.emit('evt', 'payload');
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });

  it('does not call handlers registered for a different event', () => {
    const bus = createBus();
    const fn = vi.fn();
    bus.on('a', fn);
    bus.emit('b', {});
    expect(fn).not.toHaveBeenCalled();
  });

  it('does not throw when emitting with no listeners', () => {
    const bus = createBus();
    expect(() => bus.emit('nothing', {})).not.toThrow();
  });

  it('does not share state between independent bus instances', () => {
    const bus1 = createBus();
    const bus2 = createBus();
    const fn = vi.fn();
    bus1.on('evt', fn);
    bus2.emit('evt', {});
    expect(fn).not.toHaveBeenCalled();
  });

  it('passes undefined data when emit is called without a payload', () => {
    const bus = createBus();
    const fn = vi.fn();
    bus.on('ping', fn);
    bus.emit('ping');
    expect(fn).toHaveBeenCalledWith(undefined);
  });
});
